/** @file Microsoft Authentication handler. */

import dotenv from "dotenv";

dotenv.config();

/** @type {import("../../../types").Auth} Auth */
const client = {
	icon: "https://www.microsoft.com/favicon.ico",

	link: `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${process.env.MICROSOFT_ID}&response_type=code&redirect_uri=https%3A%2F%2Fauth.onedot.cf%2Fauth%2Fmicrosoft&scope=User.Read%20User.ReadBasic.All&response_mode=form_post&state={{ nonce }}`,

	name: "Microsoft",

	pages: {
		"./microsoft": {
			async post(request, response) {
				const tokens = await fetch(
					"https://login.microsoftonline.com/common/oauth2/v2.0/token",
					{
						body: `client_id=${process.env.MICROSOFT_ID}&grant_type=authorization_code&scope=User.Read%20User.ReadBasic.All&code=${request.body.code}&redirect_uri=https%3A%2F%2Fauth.onedot.cf%2Fauth%2Fmicrosoft&client_secret=${process.env.MICROSOFT_SECRET}`,

						headers: {
							"Content-Type": "application/x-www-form-urlencoded",
						},

						method: "POST",
					},
				).then((result) => result.json());

				if (!tokens.access_token) return response.status(500);

				return this.sendResponse(
					await fetch("https://graph.microsoft.com/v1.0/me", {
						headers: {
							Authorization: `Bearer ${tokens.access_token}`,
						},
					}).then((result) => result.json()),
					request.body.state,
				);
			},
		},
	},

	website: "https://www.microsoft.com/",
};

export default client;

// Note: can't run on http, even on localhost
