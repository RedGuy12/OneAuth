/** @file Authentication APIs. */

/**
 * @type {{
 * 	fontawesome: boolean;
 * 	icon: string;
 * 	iconProvider: string;
 * 	link: string;
 * 	name: string;
 * 	svg: boolean;
 * }[]}
 */
const authButtons = [];
/** @type {import("../../types").Auth[]} */
const authClients = [],
	database = new (require("@replit/database").Client)(),
	globby = require("globby"),
	path = require("path");
const retronid = require("retronid"),
	// eslint-disable-next-line new-cap
	router = require("express").Router(),
	{ URL } = require("url");

(async () => {
	// Idk why this is relative to the root dir but it is
	const paths = await globby("src/auth/*/index.js");

	paths.forEach((filepath) => {
		const client = require(path.resolve(
			__dirname.split("/src/")[0],
			filepath,
		));
		authClients.push(client);
		authButtons.push({
			fontawesome: client.iconProvider.indexOf("fa") === 0,
			icon: client.icon,
			iconProvider: client.iconProvider,
			link: client.link,
			name: client.name,
			svg: client.iconProvider === "svg",
		});
	});
})();
/**
 * Returns information about a authentication client.
 *
 * @param {string} requestedClient - Client to retrieve information about.
 * @returns {import("../../types").Auth | undefined} - Information about the client.
 */
function getClient(requestedClient) {
	return authClients.find((currentClient) =>
		currentClient?.pages?.find(
			({ backendPage }) => backendPage === requestedClient,
		),
	);
}
/**
 * Get HTTP request handlers from a page name.
 *
 * @param {string} requestedClient - The page name.
 * @returns {import("../../types").Page | null} - The HTTP handlers.
 */
function getPageHandler(requestedClient) {
	for (const currentClient of authClients) {
		const result = currentClient?.pages?.find(
			({ backendPage }) => backendPage === requestedClient,
		);
		if (result) {
			return result;
		}
	}
	return null;
}
/**
 * Ask the user for permission to share their data, then redirect them to the specified URL.
 *
 * @param {string} client - Client that the user authenticated with.
 * @param {string | { [key: string]: string }} tokenOrData - Token to retrieve the data with or the
 *   raw data itself.
 * @param {string} url - URL to redirect the user to afterwards.
 * @param {import("../../types").ExpressResponse} res - Express response object.
 * @param {string} noDataMsg - Message to display when the data can not be shown to the user.
 * @returns {import("express").IRouter} - Express router from `res.render`.
 * @throws {TypeError} - If the type of tokenOrData is not consistent with the expected type based on rawData.
 */
function sendResponse(client, tokenOrData, url, res, noDataMsg) {
	const clientInfo = getClient(client);
	if (!clientInfo) {
		throw new ReferenceError(`Invalid client: ${client}`);
	}
	let data, token;
	if (clientInfo.rawData && typeof tokenOrData === "object") {
		data = tokenOrData;
		data.client = clientInfo.name;
		token = retronid.generate();
		database.set(`RETRIEVE_${token}`, data);
	} else if (typeof tokenOrData === "string") {
		data = noDataMsg;
		token = tokenOrData;
	} else {
		throw new TypeError(
			`Invalid type passed to sendResponse tokenOrData: ${typeof tokenOrData}`,
		);
	}
	try {
		const { host } = new URL(url);
		return res.status(300).render(path.resolve(__dirname, "allow.html"), {
			client,
			data: JSON.stringify(data),
			encodedUrl: encodeURIComponent(url),
			host,
			name: clientInfo.name,
			token,
			url,
		});
	} catch {
		return res.status(400);
	}
}
for (const method of [
	// "all",
	"checkout",
	"copy",
	"delete",
	"get",
	"head",
	"lock",
	"merge",
	"mkactivity",
	"mkcol",
	"move",
	"m-search",
	"notify",
	"options",
	"patch",
	"post",
	"purge",
	"put",
	"report",
	"search",
	"subscribe",
	"trace",
	"unlock",
	"unsubscribe",
]) {
	router[method](
		"/:client",
		/**
		 * Run the appropriate HTTP request handler on a HTTP request, or return a HTTP error code.
		 *
		 * @param {import("../../types").ExpressRequest} req - Express request object.
		 * @param {import("../../types").ExpressResponse} res - Express response object.
		 */
		(req, res) => {
			const client = getPageHandler(`${req.params.client}`);
			if (typeof client !== "object" || client === null) {
				res.status(404);
				return;
			}
			// @ts-expect-error
			if (typeof client[method] !== "function") {
				res.status(405);
				return;
			}

			// @ts-expect-error
			client[method](
				req,
				res,
				/**
				 * Passes information from the authentication handler (and other sources) to sendResponse.
				 *
				 * @param {import("../../types").sendResponseArgs} args - Information from the
				 *   authentication handler.
				 * @returns {import("express").IRouter} - Express router object.
				 */
				(...args) =>
					sendResponse(
						`${req.params.client}`,
						...args,
						`${req.messages.allowDataHidden}`,
					),
			);
		},
	);
}

router.get(
	"/",
	/**
	 * Send the authentication entry page.
	 *
	 * @param {import("../../types").ExpressRequest} req - Express request object.
	 * @param {import("../../types").ExpressResponse} res - Express response object.
	 * @returns {import("../../types").ExpressResponse | import("express").IRouter} - Express response object.
	 */
	(req, res) => {
		if (!req.query.url) {
			return res.status(400);
		}
		const authButtonsReplaced = authButtons;
		authButtons.forEach(({ link }, index) => {
			if (authButtonsReplaced[index]) {
				// @ts-expect-error
				authButtonsReplaced[index].link = link.replace(
					/{{url}}/g,
					encodeURIComponent(`${req.query.url}`),
				);
			}
		});
		return res.render(path.resolve(__dirname, "auth.html"), {
			clients: authButtonsReplaced,
		});
	},
);

router.get(
	"/backend/get_data",
	/**
	 * Retrieve the user's data.
	 *
	 * @param {import("../../types").ExpressRequest} req - Express request object.
	 * @param {import("../../types").ExpressResponse} res - Express response object.
	 * @returns {Promise<void>} - Express response object.
	 */
	async (req, res) => {
		res.setHeader("Access-Control-Allow-Origin", "*");
		res.setHeader(
			"Access-Control-Allow-Headers",
			"Origin, X-Requested-With, Content-Type, Accept",
		);

		// @ts-expect-error
		res.status(200).json(await database.get(`RETRIEVE_${req.query.code}`));
		database.delete(`RETRIEVE_${req.query.code}`);
	},
);
router.get(
	"/backend/send_data",
	/**
	 * Save the user's data.
	 *
	 * @param {import("../../types").ExpressRequest} req - Express request object.
	 * @param {import("../../types").ExpressResponse} res - Express response object.
	 * @returns {Promise<import("../../types").ExpressResponse | import("express").IRouter>} -
	 *   Express response object.
	 * @throws {ReferenceError} - If client is not valid.
	 */
	async (req, res) => {
		const { client, url, token } = req.query,
			clientInfo = getClient(`${client}`);
		if (!clientInfo) {
			throw new ReferenceError(`Invalid client: ${client}`);
		}
		let code, redirect;
		if (clientInfo.rawData) {
			code = token;
		} else {
			code = retronid.generate();
			const data = await clientInfo.getData(`${token}`);
			data.client = clientInfo.name;
			database.set(`RETRIEVE_${code}`, data);
		}
		try {
			redirect = new URL(url);
			redirect.searchParams.set("code", code);
			return res.status(303).redirect(redirect);
		} catch {
			return res.status(400);
		}
	},
);

module.exports = router;
