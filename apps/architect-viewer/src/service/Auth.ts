import { Buffer } from "buffer";

export class TokenAuthService {
    private readonly authUri: string;
    private readonly onAuthorized: (authorized: boolean) => void;

    private token: string | undefined;

    constructor(authUri: string, onAuthorized: (authorized: boolean) => void) {
        this.authUri = authUri;
        this.onAuthorized = onAuthorized;
    }

    public login = async (username: string, password: string) => {
        const response = await fetch(this.authUri, {
            headers: {
                Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
            },
        });

        if (!response.ok) {
            throw new Error(response.statusText);
        }

        this.token = await response.text();
        this.onAuthorized(true);
    };

    public logout = () => {
        this.token = undefined;
        this.onAuthorized(false);
    };

    public getAuthHeader = () => {
        return { Authorization: `Bearer ${this.token}` };
    };
}

export default TokenAuthService;
