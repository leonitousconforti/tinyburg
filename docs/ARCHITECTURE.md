# Architecture and Structure

Here is a one-two sentence overview of each package and its purpose. You should take a look at each package's readme if you need more information.

## Packages vs Apps

This monorepo is separated into two different folders, the /packages folder and the /apps folder. The difference between them being that projects in the /packages folder are generally public and published to npm whereas projects in the /apps folder are not published to npm. Nothing relevant to Tinyburg is in the /common folder, that is just a place where rush (the monorepo tool) stores some data. There are some integration examples inside of `packages/integrations`.

## [@tinyburg/apks](../packages/apks/)

An internal package that stores all versions of TinyTower that I want tinyburg to support, ready to be consumed by other tools such as @tinyburg/architect or @tinyburg/insight. It can store downloaded apks from apkpure and apkmirror but they will never be uploaded to github because they are so large. When you install it, it will automatically download the latest apks.

## [@tinyburg/architect](../packages/architect/), [@tinyburg/architect-view](../apps/architect-viewer/), and [@tinyburg/architect-orchestrator](../apps/architect-orchestrator/)

These packages install frida server along side the apks stored in @tinyburg/apks onto android emulators and then expose frida to the package consumers. They also allow you to stream the emulator to a web browser and interact with the game through the browser. This is really useful for testing purposes.

## [@tinyburg/insight](../packages/insight/) and [@tinyburg/explorer](../packages/explorer/)

These packages facilitate the reverse engineering of TinyTower by loading Frida agents into the game through @tinyburg/architect. Explorer is meant for fast prototyping and exploration as it has the ability to recompile and reload your agent when any changes are made without any interaction. Insight is where all the stable agents live and provides deep "insight" into the game with its data extraction agents.

## [@tinyburg/doorman](../packages/doorman/)

asdf

## [@tinyburg/core](../packages/core/)

This is the heart of Tinyburg. It contains all the reverse-engineered apis, data about the game, the save parser, and types for the save data.

## [@tinyburg/cli](../packages/cli/)

Allows you to use @tinyburg/core on the command line.

## [@tinyburg/authproxy](../apps/authproxy/)

This is another crucial part of Tinyburg. Because you won't have the authorization keys needed to authenticate to Nimblebit's severs, this authproxy will authenticate your requests for you. Keep in mind that without an API key it will only authenticate certain scopes and is rate limited.

## [@tinyburg/trading-site](../apps/trading-site/)

Allows players to register their towers on the site and then trade in game items with other player.

## [@tinyburg/auto-gold-bits](../apps/auto-gold-bits/)

An example project that shows you how to make it so that when someone send a bitizen to your tower it sends it back to that player as a max level bitizen for the floor they are currently requesting.

## [@tinyburg/discord-bot](../apps/discord-bot/)

todo

## [@tinyburg/economy](../apps/economy/)

todo

## [@tinyburg/bank](../apps/bank/)

todo
