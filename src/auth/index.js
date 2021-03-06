/** @file Authentication APIs. */

import { createPrivateKey, createPublicKey } from "crypto";
import path from "path";
import url from "url";

import dotenv from "dotenv";
import { Router as express } from "express";
import SignJWT from "jose-node-esm-runtime/jwt/sign";
import jwtVerify from "jose-node-esm-runtime/jwt/verify";
import mongoose from "mongoose";
import mustache from "mustache";
import retronid from "retronid";

import authClients from "../../lib/clients.js";
import { logError } from "../errors/index.js";

dotenv.config();

const app = express(),
	directory = path.dirname(url.fileURLToPath(import.meta.url));

await mongoose.connect(`${process.env.MONGO_URL}?retryWrites=true&w=majority`, {
	appName: "OneAuth",
});

mongoose.connection.on("error", logError);

const Database = mongoose.model(
		"Nonce",
		new mongoose.Schema({
			nonce: {
				match: /^[\da-z]{10}$/,
				required: true,
				type: String,
				unique: true,
			},

			psuedoNonce: {
				match: /^[\da-z]{10}$/,
				required: true,
				type: String,
				unique: true,
			},

			redirect: {
				required: true,
				type: String,
			},
		}),
	),
	JWT_ALGORITHM = "ES256",
	PRIVATE_KEY = createPrivateKey(
		`${process.env.EC_PRIVATE_KEY_0}\n${process.env.EC_PRIVATE_KEY_1}\n${process.env.EC_PRIVATE_KEY_2}\n${process.env.EC_PRIVATE_KEY_3}\n${process.env.EC_PRIVATE_KEY_4}`,
	),
	PUBLIC_KEY = createPublicKey(
		`${process.env.EC_PUBLIC_KEY_0}\n${process.env.EC_PUBLIC_KEY_1}\n${process.env.EC_PUBLIC_KEY_2}\n${process.env.EC_PUBLIC_KEY_3}`,
	);

app.all("/auth", async (request, response) => {
	try {
		// eslint-disable-next-line no-new -- There are no side-effects here.
		new URL(`${request.query.url}`);
	} catch {
		response.status(400);

		return logError(new URIError(`Invalid URL: ${request.query.url}`));
	}

	// Set a nonce and a psuedo nonce
	const nonce = retronid(),
		psuedoNonce = retronid();

	// Save the nonces to the database
	await new Database({
		nonce,
		psuedoNonce,
		redirect: request.query.url,
	}).save();

	// Store the psuedo nonce in a cookie
	const expires = new Date();

	expires.setMinutes(expires.getMinutes() + 15);
	response.cookie("nonce", psuedoNonce, {
		expires,
		httpOnly: true,
		maxAge: 900000,
		sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
		secure: process.env.NODE_ENV === "production",
		signed: false,
	});

	return response.render(path.resolve(directory, "auth.html"), {
		clients: authClients.map((client) => ({
			...client,

			link: mustache.render(client.link, {
				nonce,
			}),
		})),
	});
});

/** @type {{ [key: string]: undefined | import("../../types").Page }} */
const clientsByPage = Object.assign({}, ...authClients.map(({ pages }) => pages));

for (const [page, handlers] of Object.entries(clientsByPage)) {
	app.all(new URL(page, "https://auth.onedot.cf/auth/").pathname, (request, response, next) => {
		/** @type {import("../../types").RequestFunction | undefined} */
		// @ts-expect-error -- TS doesn't know that there is a limited set of values for `request.method`.
		const handler = handlers.all || handlers[`${request.method.toLowerCase()}`];

		if (typeof handler !== "function") return response.status(405);

		/**
		 * Handle redirecting the user after authentication finishes.
		 *
		 * @type {import("../../types").SendResponse}
		 */
		const sendResponse = async (data, nonce) => {
			// Check nonce
			const { redirect } =
				(await Database.findOneAndDelete({
					nonce,
					psuedoNonce: request.cookies.nonce,
				}).exec()) || {};

			if (!redirect) return response.status(403);

			// Get client info
			const client = authClients.find(({ pages }) => pages[`${page}`]);

			if (!client) return next();

			// Get data
			// TODO: make a standard
			const jwt = await new SignJWT({ ...data, client: client.name })
				.setExpirationTime("15 minutes")
				.setIssuedAt()
				.setIssuer("OneDot")
				.setProtectedHeader({ alg: JWT_ALGORITHM })
				.sign(PRIVATE_KEY);

			// Render allow page
			try {
				const redirectUrl = new URL(redirect);

				redirectUrl.searchParams.set("token", jwt);

				return response._status(300).render(path.resolve(directory, "allow.html"), {
					allowUrl: redirectUrl,
					client: client.name,

					data: JSON.stringify({
						payload: { ...data, client: client.name },
						protectedHeader: { alg: JWT_ALGORITHM },
					}),

					denyUrl: redirectUrl,
					host: redirectUrl.host,
				});
			} catch {
				response.status(400);

				return logError(new URIError(`Invalid URL: ${redirect}`));
			}
		};

		return handler.call(
			{
				sendResponse,
			},
			request,
			response,
			(error) => {
				if (error) return next(error);

				/** @type {import("../../types").RequestFunction | undefined} */
				// @ts-expect-error -- TS doesn't know that there is a limited set of values for `request.method`.
				const nextHandler = handlers[`${request.method.toLowerCase()}`];

				if (handlers?.all && nextHandler) {
					return nextHandler.call(
						{
							sendResponse,
						},
						request,
						response,
						next,
					);
				}

				return next(error);
			},
		);
	});
}

app.all("/backend/get_data", (request, response) => {
	response.setHeader("Access-Control-Allow-Origin", "*");
	response.setHeader(
		"Access-Control-Allow-Headers",
		"Origin, X-Requested-With, Content-Type, Accept",
	);

	return jwtVerify(`${request.query.token}`, PUBLIC_KEY, {
		algorithms: [JWT_ALGORITHM],
		issuer: "OneDot",
		maxTokenAge: "15 minutes",
	})
		.then(response.send)
		.catch((error) => {
			response.status(401);

			return logError(error);
		});
});

export default app;
