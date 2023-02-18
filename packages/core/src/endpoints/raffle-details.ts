import got from "got";
import { defaultHeaders } from "../contact-server.js";
import { DebugLogger, ILogger } from "../logger.js";

// Debug logger (will default to using this if no other logger is supplied)
const loggingNamespace: string = "tinyburg:endpoints:raffle_details";
const debug: ILogger = new DebugLogger(loggingNamespace);

// Nimblebit api raffle details response type.
export interface IRaffleDetails {
    id: string;
    players: string;
    winners: string;
    raffleEnd: number;
}

// Nimblebit api raffle details url.
export const raffleDetailsEndpoint: string = "https://s3.amazonaws.com/NBStatic/sync/tt/currentRaffle.json";

// Obtains information about the current raffle drawing.
export const raffleDetails = async (logger: ILogger = debug): Promise<IRaffleDetails> => {
    const url = new URL(raffleDetailsEndpoint);
    logger.info("Sending raffle details request to %s", url.toString());
    return got.get(url, { headers: defaultHeaders }).json<IRaffleDetails>();
};
