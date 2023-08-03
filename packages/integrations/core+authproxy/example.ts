import tinybrug from "@tinyburg/core";
import config from "./tinyburgrc.json" assert { type: "json" };

// eslint-disable-next-line @rushstack/typedef-var
const client = tinybrug.fromConfig(config);
client.config.proxy.useProxy = true;

const enteredInCurrentRaffle: boolean = await client.checkEnteredRaffle();
client.logger.info("Entered in current raffle: %s", enteredInCurrentRaffle);
