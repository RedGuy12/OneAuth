/** @file Discord Authentication handler. */

import dotenv from "dotenv";

dotenv.config();

/** @type {import("../../../types").Auth} Auth */
const client = {
	icon: "/auth/discord/logo.svg",
	link: `https://discord.com/api/oauth2/authorize?client_id=${process.env.DISCORD_ID}&redirect_uri=https%3A%2F%2Fauth.onedot.cf%2Fauth%2Fdiscord&response_type=code&scope=identify%20connections%20email&state={{ nonce }}`,
	name: "Discord",

	pages: {
		"./discord": {
			async all(request) {
				// Get tokens
				const tokens = await fetch("https://discord.com/api/oauth2/token", {
					body:
						`client_id=${process.env.DISCORD_ID}&client_secret=${process.env.DISCORD_SECRET}` +
						`&code=${request.query.code}&grant_type=authorization_code&scope=identify+connections+email` +
						"&redirect_uri=https%3A%2F%2Fauth.onedot.cf%2Fauth%2Fdiscord",

					headers: {
						"Content-Type": "application/x-www-form-urlencoded",
					},

					method: "POST",
				}).then((result) => result.json());

				return this.sendResponse(
					{
						// Get user data
						...(await fetch("https://discord.com/api/users/@me", {
							headers: {
								authorization: `${tokens.token_type} ${tokens.access_token}`,
							},
						}).then((result) => result.json())),

						// Get user connections
						connections: await fetch("https://discord.com/api/users/@me/connections", {
							headers: {
								authorization: `${tokens.token_type} ${tokens.access_token}`,
							},
						}).then((result) => result.json()),
					},
					`${request.query.state}`,
				);
			},
		},
	},

	website: "https://discord.com/",
};

export default client;
