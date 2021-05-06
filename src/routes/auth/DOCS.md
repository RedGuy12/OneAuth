TODO: move to wiki or our own docs

name: Name of the client
link: Absoolute URI that users are directed to when they click the button. {{url}} will be replaced with the uri-encoded url to be redirected to. Each client is responsible for storring it in some way.
icon: Icon of the client. Should be the name of
a SVG file in the routes/svg directory (without the .svg extention),
the name of a FontAwesome icon,
or an absolute url
iconProvider: Determines which of the above the icon is. Should be one of svg, url, or fa
pages: Array of objects. Each object can have these properties:
post: Function that runs on a HTTP POST request to backendPage. Takes three arguments:
req: Express request object
res: Express response object
sendResponse: Function that takes three arguments:
tokenOrData: Token returned by the client that can be passed to the getData function. Alternatively this can be the user's data (see rawData).
url: URI to redirect to afterwards. Should have come from {{url}} in link.
res: Express response object
get: Function that runs on a HTTP GET request to backendPage. Takes the same three arguments as post.
backendPage: Page that handles the said HTTP requests. Relative to <HOSTNAME>/auth/
getData: Function that return a users' data based on a token. Takes one argument:
token: token passed to pages.post.sendResponse via tokenOrData
rawData: boolean that determines if instead of passing a token to sendResponse, you will send the users' data directly. ONLY USE IF ALL THE DATA YOU RE SENDING CAN BE VIEWED BY ANYONE ANYWHERE ANYTIME