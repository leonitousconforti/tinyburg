import { test } from "tap";
import * as path from "path";
import { ApiKey } from "../entity/ApiKey";
import { createConnection } from "typeorm";

test("API key", async (t) => {
    t.plan(8);

    // Create a postgres connection
    const postgresConn = await createConnection({
        type: "postgres",
        url: "postgresql://postgres:password@localhost:5432/authproxy",
        database: "authproxy",
        synchronize: true,
        dropSchema: true,
        logging: false,
        entities: [path.join(__dirname, "..", "entity", "*.*")],
    });

    // Create and test apiKey
    const apiKey = await ApiKey.create({ rateLimitPerWindow: 13, privilegedScopes: ["new_user"] }).save();
    const result1 = apiKey.apiKey;

    t.equal(apiKey.name, "default");
    t.equal(apiKey.seen, false);
    t.equal(apiKey.rateLimitPerWindow, 13);
    t.strictSame(apiKey.privilegedScopes, ["new_user"]);
    t.equal(apiKey.lastUsed, null);
    t.not(apiKey.apiKey, null);

    // Roll the key
    await apiKey.roll();
    t.not(apiKey.apiKey, null);
    t.strictNotSame(apiKey.apiKey, result1);

    // Close the postgres connection
    await ApiKey.remove(apiKey);
    await postgresConn.close();
    t.end();
});
