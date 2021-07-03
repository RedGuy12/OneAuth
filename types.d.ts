export interface nestedObjStr {
	[key: string]: string | nestedObjStr;
}

export interface lighthouseResult {
	code: string;
	data: {
		url: string;
		emulatedFormFactor: string;
		scores: {
			accessibility: number;
			bestPractices: number;
			performance: number;
			progressiveWebApp: number;
			seo: number;
		};
	}[];
}

interface AuthObj {
	icon: string;
	iconProvider?: "svg" | "url" | "far" | "fab" | "fas";
	link: string;
	name: string;
	pages?: Page[];
	getData: (token: string) => Promise<{ [key: string]: string }>;
	rawData: boolean;
}
export type RequestFunction = (
	request: e.Request,
	response: e.Response,
	sendResponse: (tokenOrData: any, url: string) => void | e.Response,
) => Promise<void>;
export interface Page {
	"backendPage": string;
	// "all"?: RequestFunction;
	"checkout"?: RequestFunction;
	"copy"?: RequestFunction;
	"delete"?: RequestFunction;
	"get"?: RequestFunction;
	"head"?: RequestFunction;
	"lock"?: RequestFunction;
	"merge"?: RequestFunction;
	"mkactivity"?: RequestFunction;
	"mkcol"?: RequestFunction;
	"move"?: RequestFunction;
	"m-search"?: RequestFunction;
	"notify"?: RequestFunction;
	"options"?: RequestFunction;
	"patch"?: RequestFunction;
	"post"?: RequestFunction;
	"purge"?: RequestFunction;
	"put"?: RequestFunction;
	"report"?: RequestFunction;
	"search"?: RequestFunction;
	"subscribe"?: RequestFunction;
	"trace"?: RequestFunction;
	"unlock"?: RequestFunction;
	"unsubscribe"?: RequestFunction;
}
export type sendResponseArgs = [string | { [key: string]: string }, string];
export type Auth = AuthObj;
