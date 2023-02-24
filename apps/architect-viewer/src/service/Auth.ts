import axios from "axios";
import { EventEmitter } from "events";

export class TokenAuthService extends EventEmitter {
    private readonly authUri: string;
    private token: string | undefined;

    constructor(authUri: string) {
        super();
        this.authUri = authUri;
    }

    public login = async (email: string, password: string) => {
        const response = await axios.get(this.authUri, {
            auth: {
                username: email,
                password: password,
            },
        });
        this.token = "Bearer " + response.data;
        this.emit("authorized", true);
    };

    public logout = () => {
        return new Promise((resolve) => {
            this.token = undefined;
            resolve(undefined);
            this.emit("authorized", false);
        });
    };

    public isAuthorized = () => {
        return this.token !== undefined;
    };

    public authHeader = () => {
        return { Authorization: this.token };
    };
}
