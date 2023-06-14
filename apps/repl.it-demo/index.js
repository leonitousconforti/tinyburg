import prompts from "prompts";
import { fork } from "node:child_process";
import { isValidEmailAddress } from "@tinyburg/core/endpoints/register-email";
import { isValidPlayerId } from "@tinyburg/core/validation/is-valid-player-id";

// Capture user input for playerId and cloud email
const { playerId, playerEmail } = await prompts(
    [
        {
            type: "text",
            name: "playerId",
            message: "What is your tiny tower playerId?",
            validate: (id) => isValidPlayerId(id),
        },
        {
            type: "text",
            name: "playerEmail",
            message: "What is your tiny tower cloud sync email address?",
            validate: (email) => isValidEmailAddress(email),
        },
    ],
    { onCancel: () => Promise.all([console.log("Canceled by user, exiting..."), process.exit()]) }
);

// Spawn the CLI app
let env = { DEBUG: "tinyburg:*" };
let cliArgs = ["-i", playerId, "-e", playerEmail];
fork("node_modules/.bin/TinyTower-cli", cliArgs, { env });
