import { Buffer } from "buffer";

export class TokenAuthService {
    private readonly _authUri: string;
    private readonly _onAuthorized: (authorized: boolean) => void;

    private _token: string | undefined;

    public constructor(authUri: string, onAuthorized: (authorized: boolean) => void) {
        this._authUri = authUri;
        this._onAuthorized = onAuthorized;
    }

    public login = async (username: string, password: string): Promise<void> => {
        const response = await fetch(this._authUri, {
            headers: {
                Authorization: `Basic ${Buffer.from(username + ":" + password).toString("base64")}`,
            },
        });
        if (!response.ok) {
            throw new Error(response.statusText);
        }
        this._token = await response.text();
        this._onAuthorized(true);
    };

    public logout = (): void => {
        this._token = undefined;
        this._onAuthorized(false);
    };

    public getAuthHeader = (): { Authorization: string } => {
        return { Authorization: `Bearer ${this._token}` };
    };
}

export default TokenAuthService;
