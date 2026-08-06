/**
 * Stands in for the uptime monitor the deployed services ping.
 *
 * `HEARTBEAT_URL` is a required config in social-circles and both workers, so
 * without something listening they refuse to start locally. This logs what
 * checked in and says 200, which is all any of them look at.
 */

import { createServer } from "node:http";

const port = Number(process.env.PORT ?? 3999);

createServer((request, response) => {
    console.log(`heartbeat ${request.method} ${request.url}`);
    response.writeHead(200, { "content-type": "text/plain" });
    response.end("ok\n");
}).listen(port, "127.0.0.1", () => {
    console.log(`heartbeat sink listening on http://127.0.0.1:${port}`);
});
