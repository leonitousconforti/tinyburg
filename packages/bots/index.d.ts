declare type BurnBot = { playerId: string; playerSs: string };
export declare const burnerBots: { [k: string]: BurnBot };
export declare const getRandomBurnerBot: () => BurnBot;
