<div id="top"></div>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <a href="https://github.com/leonitousconforti/tinyburg">
    <img src="docs/images/tinyburgBanner.png" alt="Logo">
  </a>

  <h3 align="center">Tinyburg</h3>

  <p align="center">
    Api and trading platform for the mobile game Tiny Tower by Nimblebit
    <br />
    <a href="https://github.com/leonitousconforti/tinyburg/tree/main/docs"><strong>Explore the docs »</strong></a>
    <br />
    <br />
    <a href="https://tinyburg.app/">View Demo</a>
    ·
    <a href="https://github.com/leonitousconforti/tinyburg/issues">Report Bug</a>
    ·
    <a href="https://github.com/leonitousconforti/tinyburg/issues">Request Feature</a>
  </p>

[![build][build-shield]][build-url]
![Nimblebit version support][nimblebit-version-support-shield]
[![Maintainability][maintainability-shield]][maintainability-url]
[![Test Coverage][coverage-shield]][coverage-url]

</div>

## note

some of this information is outdated since I have moved this project to a monorepo. I just haven't updated it yet

## About Tinyburg

Tinyburg is a JavaScript library/API built for the mobile game Tiny Tower by [Nimblebit](http://nimblebit.com/ "Nimblebit"). The initial desire for creating this library came from wanting to build an application that automatically entered me into the raffle every hour. While I am aware that you could achieve some of the same results by running Tiny Tower on your computer with an emulator like blue stacks and writing a simple script to make your mouse enter the raffle every hour, that really wasn't as exciting/what I really wanted to do. Some notable projects I found on GitHub that take this approach include [Cydia--Script-TinyTowerBot](https://github.com/egold555/Cydia--Script-TinyTowerBot), [TinyClicker](https://github.com/filadog/TinyClicker),
[SortTinyTowerWorkers](https://github.com/andagr/SortTinyTowerWorkers), [Tiny-Tower-Bot](https://github.com/CeHaga/Tiny-Tower-Bot), and [tiny-tower-bot](https://github.com/jacdavwill/tiny-tower-bot). I looked pretty hard on GitHub but these 5 projects were the only things I could find that had code pushed to them and were somewhat functioning. Tinyburg, however, is unique because it enables you to do anything you can do on the mobile game and more from anywhere with an internet connection without needing to open the app. Not to mention there are some things that you simply cannot do with just an emulator, mouse scripts, and screen recording/video processing. Tinyburg achieves all this by utilizing the same API that Tiny Tower to make requests to Nimblebit’s servers.

### How tinyburg works

Tinyburg works by utilizing the cloud sync feature in Tiny Tower; without it Tinyburg would not be possible. If you are not familiar with the cloud sync feature, it allows you to sign in and sync your tower across multiple devices. Although some people have trouble getting their towers to sync properly when signed in to multiple devices, I have had no problem using tinyburg as long as you follow the best practices. Tinyburg is very robust and has been tested against every TinyTower version starting with 3.14.0 up to 4.2.0. Of note is that if you never push a save using the tinyburg library, then there is absolutely no way for your tower to stop syncing or for you to get banned for cheating. This means that you can still use every other feature available and be 100% confident that you won't screw anything up. If you are trying to build a project or mess around with tinyburg, I recommend starting with a dummy account first either in an emulator or somewhere else so just in case you mess something up it isn't on your main tower.

### :dart: Features

-   Downloading, decompressing, parsing, modifying, compressing, and uploading save game data (your tower)
-   Typed save data - save data is parsed into objects with types so that you can easily tell what you are modifying
-   Getting visits + visiting friends
-   Sending gifts (bitizens) + receiving gifts (bitizens, raffle tickets, gold/coins)
-   Check entered raffle status, enter raffle, enter multi-raffle, and get raffle details
-   Pulling your snapshot list, pulling snapshot data, and pushing snapshots (rebuilds)
-   Adding friends, Pulling friend meta data, pulling friends tower, pulling friends snapshot list
-   bitbook cloud posts (there is a bitbook cloud feed apart from the posts in your save data)
-   cloud gifts feed (a feed where nimblebit can send gifts to everyone)
-   Registering cloud sync email, verifying cloud sync email (used for the cloud sync sign in process and authentication workflow)
-   Creating new player accounts
-   Send gifts to yourself by proxing them through a burn-bot
-   Configurable logging (pino, debug, or bring your own logger)

### On the list of things to do (finishing soon, hopefully)

-   Integration tests, maybe find a way to run the android studio emulator in docker too
-   Leaderboards??? (Pull from google play leaderboards and apple game center)

### Things I am not going to support/add

-   Signing in through facebook/gamecenter/google play

## Less talk, where's a working demo?

[![Run on repl.it](https://replit.com/badge/github/leonitousconforti/tinyburg.svg)](https://repl.it/github/leonitousconforti/tinyburg)
[![Try it online on RunKit](https://img.shields.io/badge/Try%20it%20online%20on-RunKit-f55fa6)](https://npm.runkit.com/tinyburg)

A working demo can be found on REPL: <https://replit.com/@LeoConforti1/tinyburg-demo?v=1>, it features the CLI app from the most recent version of Tinyburg. Feel free to mess around on REPL and if you end up breaking something just refresh the page. Additionally, if you prefer a more condensed view, you can use the [lite REPL](https://replit.com/@LeoConforti1/tinyburg-demo?lite=1&outputonly=1) option

There is also RunKit example at <https://npm.runkit.com/tinyburg> although it is not sophisticated as the REPL demo. The RunKit example is more just for people to be able to mess around with the code and get a feel for the library, while the REPL is an actual demo.

The tinyburg site is in the works. [https://tinyburg.app](https://tinyburg.app) will hopefully be a place where players can go to trade in game items with each other - anything from singular bitizens to entire floors or costumes or lobbies and so much more! You could really trade anything from the entire game, as long as there is someone willing to trade with you.

## :space_invader: Built with

<details>
<summary>Core library</summary>
  <ul>
    <li><a href="https://www.typescriptlang.org/">Typescript</a></li>
  </ul>
</details>

<details>
<summary>Authproxy</summary>
  <ul>
    <li><a href="https://www.typescriptlang.org/">Typescript</a></li>
  </ul>
</details>

<details>
  <summary>Web frontend</summary>
  <ul>
    <li><a href="https://www.typescriptlang.org/">Typescript</a></li>
    <li><a href="https://nextjs.org/">Next.js</a></li>
    <li><a href="https://reactjs.org/">React.js</a></li>
    <li><a href="https://tailwindcss.com/">TailwindCSS</a></li>
  </ul>
</details>

<details>
  <summary>Server backend</summary>
  <ul>
    <li><a href="https://www.typescriptlang.org/">Typescript</a></li>
    <li><a href="https://www.apollographql.com/">Apollo</a></li>
    <li><a href="https://graphql.org/">GraphQL</a></li>
  </ul>
</details>

## :toolbox: Using tinyburg

![npm version](https://img.shields.io/npm/v/tinyburg)
![npm downloads](https://img.shields.io/npm/dw/tinyburg)
![npm bundle size](https://img.shields.io/bundlephobia/minzip/tinyburg)

### :gear: Installation

#### npm

`npm install --save tinyburg`

#### yarn

`yarn add tinyburg`

### :running: Run Locally

Clone the project

`git clone https://github.com/leonitousconforti/tinyburg.git`, add `--recursive` if you want to pull the submodules too

Go to the project directory

`cd tinyburg`

Install the dependencies and husky hooks

`yarn install && yarn prepare`

### :triangular_flag_on_post: Building and linting

To build and lint the tinyburg core library run

```bash
yarn lint && yarn build
```

### :test_tube: Running Tests

To run tests run the following commands

```bash
yarn test:spec && yarn test:integrations
```

### :card_file_box: Commit code

To make a commit, first run

```bash
yarn gitleaks
```

to ensure that you are not publishing any secrets, then run

```bash
git add <files here>
```

```bash
yarn commit
```

to make you commit with commitizen

## :memo: Have Questions or Need Help? Check out the docs

![lots of docs](https://img.shields.io/badge/docs-lots%20of%20them-blueviolet)

Most of the information is documented there, so please try to read them first. If you still can't find the information you are looking for, feel free to open a [discussion](https://github.com/leonitousconforti/tinyburg/discussions) post and try to leave issues to bug reports or other problems.

-   [Configuring tinyburg](docs/Configuration.md)
-   [Authentication](docs/Authentication.md)
-   [Using the CLI app](docs/CLI.md)
-   [Implemented game endpoints](docs/Endpoints.md)
-   [Handling save game data](docs/HandlingSaveGameData.md)
-   [Using the auth proxy](docs/AuthProxy.md)

and there are some examples as well to help get you started

-   [Authentication example](examples/authenticate_app.js)
-   [Modify your save data](examples/booster_app.js)
-   [Raffle example](examples/raffle_app.js)
-   [Connecting to the auth proxy](examples/connecting-to-auth-proxy_app.js)
-   [Working with gifts and bitizens](examples/auto-gold-bits.js)

## :bulb: Fun projects you could actually make

-   A 'better' discord RaffleBot

    Ok maybe better is being a little too harsh here. I love the current discord raffle bot, but it is a little simple and you could enhance it with some new features. Why not have the bot be able to query if you are currently entered in the raffle or not.

-   A player stats leader board

    Collect player stats and display who has the most of a particular thing, or something similar.

-   A bitbook post tweeter

    Collect bitbook posts from your save data or other players save data and create a Twitter feed using them

-   An auto gold bit farm

    A tower where when you send your bitizens to it, it sends them back as gold bitizens. (Example, see: [examples/auto-gold-bits](./examples/auto-gold-bits.js))

## :wave: Interested in Contributing?

There is a [Contributing Guide](docs/CONTRIBUTING.md) to help with you with pull requests, issues, commit messages, and style guides. And there is a [Dev Guide](docs/DevGuide.md) to help you with setting up your dev environment and containers.

If you are interested in seeing how far this project will go but don't necessarily have the time or resources to contribute to open source, consider sponsoring this project through github sponsors or by signing up to DigitalOcean using the link below (yes its a link). You will get a $100 credit to spend in 60 days on DigitalOcean and once you've spent $25 (after the initial $100 credit, I know it's a lot), I'll get $25 in return.

<br>

[![DigitalOcean Referral Badge](https://web-platforms.sfo2.digitaloceanspaces.com/WWW/Badge%203.svg)](https://www.digitalocean.com/?refcode=a7ea25b2bb84&utm_campaign=Referral_Invite&utm_medium=Referral_Program&utm_source=badge)

## Demo

Shows off tinyburg's really cool type definitions! Type definitions are provided for everything (as is standard for most typescript project), but what is really unique are the types for parsed json save data so you can really explore your save data!

See the [Type Definitions](examples/type-definitions_example.js) example for more about strict type checking for save data.

![Gif Demo](docs/images/tinyburg_recorded_example-1632028529554.gif)

[build-shield]: https://github.com/leonitousconforti/tinyburg/actions/workflows/node.js.yml/badge.svg
[build-url]: https://github.com/leonitousconforti/tinyburg/actions/workflows/node.js.yml
[nimblebit-version-support-shield]: https://img.shields.io/badge/Nimblebit%20Version%20Support-v3.14.0%20--%20v4.1.0-blue
[maintainability-shield]: https://api.codeclimate.com/v1/badges/45c27e3e0327740060bb/maintainability
[maintainability-url]: https://codeclimate.com/github/leonitousconforti/tinyburg/maintainability
[coverage-shield]: https://api.codeclimate.com/v1/badges/45c27e3e0327740060bb/test_coverage
[coverage-url]: https://codeclimate.com/github/leonitousconforti/tinyburg/test_coverage
