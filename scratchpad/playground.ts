/** @internal */
export const webHandlerToDigitalOceanFunction = (
    webHandler: (request: globalThis.Request) => Promise<globalThis.Response>
): ((event: {
    http: {
        body: string;
        headers: {
            accept: string;
            "accept-encoding": string;
            "content-type": string;
            host: string;
            "user-agent": string;
            "x-forwarded-for": string;
            "x-forwarded-proto": string;
            "x-request-id": string;
        };
        isBase64Encoded: boolean;
        method: string;
        path: string;
        queryString: string;
    };
}) => Promise<{
    body: unknown;
    statusCode: number;
    headers: { [key: string]: string };
}>) => {
    return async (event) => {
        const request = new Request(
            new URL(event.http.path + "?" + event.http.queryString, `https://${event.http.headers.host}`),
            {
                method: event.http.method,
                headers: event.http.headers,
                body: event.http.isBase64Encoded
                    ? Uint8Array.from(atob(event.http.body), (c) => c.charCodeAt(0))
                    : event.http.body,
            }
        );

        const response = await webHandler(request);

        const responseStatus = response.status;
        const responseBody = await response.text();
        const responseHeaders = Object.fromEntries(response.headers.entries());

        return {
            statusCode: responseStatus,
            headers: responseHeaders,
            body: responseBody,
        };
    };
};
