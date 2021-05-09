"use strict";

const fetch = require("node-fetch");

module.exports = {
	icon: "github",
	iconProvider: "fa",
	link:
		"https://github.com/login/oauth/authorize?client_id=7b64414fe57e07d1e969&redirect_uri=https://auth.onedot.cf/auth/github&state={{url}}",
	name: "GitHub",

	pages: [
		{
			backendPage: "github",
			get: async (req, res, sendResponse) => {
				const info = await fetch("https://github.com/login/oauth/access_token", {
					body:
						"client_id=7b64414fe57e07d1e969" +
						`&client_secret=${process.env.githubSECRET}` +
						`&code=${req.query.code}` +
						`&state=${req.query.state}`,
					headers: {
						accept: "application/json",
						"Content-Type": "application/x-www-form-urlencoded",
					},
					method: "POST",
				})
					.then((result) => result.json())
					.catch((err) => res.status(502).json(err));

				// jshint camelcase:false
				sendResponse(info.access_token, req.query.state, res);
				// jshint camelcase:true
			},
		},
	],
	getData: async (token) => await fetch("https://api.github.com/user", {
		headers: {
			accept: "application/json",
			Authorization: `token ${token}`,
		},
	}).then((res) => res.json()),
};
