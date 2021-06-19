/** @file Determine Which GitHub users have answered discussions before. */

"use strict";

const REPO_NAME = "ScratchAddons",
	REPO_OWNER = "ScratchAddons",
	fetch = require("node-fetch"),
	/** @type {(string | undefined)[][]} */
	result = [];

function graphql(query, ...placeholderValues) {
	return placeholderValues.reduce((last, placeholder, index) => {
		return `${last}${placeholder}${query[index + 1]}`;
	}, query[0]);
}

/**
 * Get a page of discussions based on a previous discussion's hash.
 *
 * @param {string} [hash] - Retrieve all issues after this hash. If no hash is provided or the hash
 *   is blank, the first page will be returned.
 *
 * @returns {Promise<{
 * 	discussions: { username?: string; cursor: string }[];
 * 	total?: number;
 * }>}
 *   - The retrieved discussion information.
 */
async function getPage(hash = "") {
	const nextRequest = {
			// hmmst… query strings break prettier formatting...mustache? maybe
			query: graphql`{


			repository(name: "${REPO_NAME}", owner: "${REPO_OWNER}") {
				discussions(
					${hash ? `after: "${hash}",` : ""}
										first: 100,
					orderBy: {direction: DESC, field: CREATED_AT}
					) {



						edges {
							cursor
						node { answer { author { login } } }

			}
					totalCount
				}
			}
		}`,
			variables: null,
		},
		/**
		 * @type {{
		 * 	data: {
		 * 		repository: {
		 * 			discussions: {
		 * 				edges: {
		 * 					cursor: string;
		 * 					node: { answer?: { author: { login: string } } };
		 * 				}[];
		 * 				totalCount: number;
		 * 			};
		 * 		};
		 * 	};
		 * }}
		 */
		{
			data: {
				repository: {
					discussions: { edges: discussions, totalCount },
				},
			},
		} = await fetch("https://api.github.com/graphql", {
			body: JSON.stringify(nextRequest),
			headers: {
				"Authorization": `Bearer ${process.argv[2]}`,
				"GraphQL-Features": "discussions_api",
			},
			method: "POST",
		}).then((response) => response.json());

	/** @type {{ cursor: string; username?: string }[]} */
	const processedDiscussions = discussions.map((discussion) => ({
		cursor: discussion.cursor,
		username: discussion.node.answer?.author?.login,
	}));
	return { discussions: processedDiscussions, total: totalCount };
}

getPage("").then(async ({ discussions, total }) => {
	let discussionIndex = discussions.length,
		hash = discussions[discussions.length - 1]?.cursor;
	if (!total || !hash) {
		throw new Error(
			`\`total\` or \`hash\` is falsy! \`hash\`: ${hash}. \`total\`: ${total}.`,
		);
	}
	result.push(discussions.map((discussion) => discussion.username));
	while (discussionIndex < total) {
		/** @type {{ username?: string; cursor: string }[]} */
		// eslint-disable-next-line no-await-in-loop -- We can't use `Promise.all` here.
		const nextDiscussions = (await getPage(hash)).discussions;
		hash = nextDiscussions[nextDiscussions.length - 1]?.cursor;
		discussionIndex += nextDiscussions.length;
		result.push(nextDiscussions.map((discussion) => discussion.username));
	}

	console.log(
		[...new Set(result.flat().filter((username) => username))].join("\n"),
	);
});
