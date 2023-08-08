# TinyTower documentation

Here you will find the documentation on how TinyTower works and what I have learned reverse engineering the Nimblebit APIs.

## Basic authentication

All network requests sent to Nimblebit's servers require authentication that mostly follows the same pattern:

```
https://sync.nimblebit.com/endpoint/playerId/salt/hash
```

Where the endpoint is something like:

-   /register/tt/
-   /verify_device/tt/
-   /register_email/tt/
-   /sync/pull/tt/
-   /sync/push/tt/
-   /sync/current_version/tt/
-   /raffle/enter/tt/
-   /raffle/enter_multi/tt/
-   /raffle/entered_current/tt/
-   and so on...

The playerId is just the alpha-numeric case-insensitive string that is your friendId - you can find it in the cloud sync settings menu. The salt is a randomly generated 32 bit signed integer which is regenerated on every new request. And the hash is a md5 hash which follows the pattern bellow most of the time

"tt/" + playerId + "/" + salt + playerSs + authenticationKey

Concatenate that string and take the md5 hash of that to use as the last part of the request. You will notice that there are two parts in the hash that are not seen anywhere else - the playerSs and the authenticationKey. The playerSs (player secret salt is what I call it) is a UUIDv4 string that is paired to your playerId, if you don't have the right playerId playerSs pair then the authentication will fail. You can think of your playerSs as a password. Your device (and by extension you) know your playerSs as well as the server, but no one else. Because of the nature of UUIDv4, it is impossible to brute force this parameter and it will have to be obtained some other way. The authenticationKey is a basic authentication key used in every request. While you playerSs acts like a password and affirms that you are who you say you are or you at least have permission to say you are who you are, the authenticationKey affirms that this request came from the real version of the game.

## Obtaining your playerId and playerSs pair

Your playerId playerSs pair is only every sent to your device on two occasions - this is to ensure that no one else but the server and you know it. They are sent to your device when:

1. You have just downloaded the app and open it for the first time ever. The game is not associated with a playerId playerSs pair yet so it requests a new pair from the sever. A completely new playerId and playerSs is generated and returned by the server. The pair is stored in persistent storage on your device (or on the google play games or apple game center or what not). If you were to delete the app and then re-download it, the game would detect the old keys on your device so it would not request a new user.
2. Nimblebit has implemented their own cloud sync - this is separate form just logging in with the same appleID or google account. Nimblebit's cloud sync allows you to assign you account to an email address and then login with that same email address on any other device. Nimblebit will send you an email with a verification code to confirm that you have just signed in on a new device and once you input that verification code in game you have your save game back.

Scenario #1 is not a viable option for obtaining the keys because we would have to have watched the network requests as the account was being created, which we can't because it already happened, or we would have to find someway of accessing the storage on your device and finding the particular file where TinyTower saves this data. While it is technically possible, it is simply not feasible to pull off on all devices, as some devices might require root privileges to access certain files (I'm not entirely sure as I did not look into this because there is an easier way).

We can, however, take advantage of scenario #2 to obtain your playerId playerSs pair. When you login to a new device through cloud sync, the new device doesn't know what your playerId playerSs is - it knows what the previous players keys were but it doesn't know your new ones. Thus, the server sends your keys to the new device so that it can make game requests. We can capture that response by impersonating being a new device. The authentication workflow goes like this:

1. The @tinyburg/core library pretends to be a new device and makes a network request that it would like to sign in to a new cloud sync save, in particular the one associated with your email.
2. You will receive an email from Nimblebit cloud sync with a verification code to finish the sign in process
3. You will have to enter that verification code to the tinyburg library at which point it will send it off to Nimblebit to prove that you authorized this new sync sign in.
4. Nimblebit will send back your playerId and playerSs (as to Nimblebit's servers we are just someone who is trying to sign in to their cloud sync on a new device) and tinyburg will allow you to save your credentials to a file for future requests

None of this is possible without the player's consent - no one can simply login to your cloud sync. You will be sent an email from Nimblebit with the verification code and if you choose not to provide the verification code then things just won't work. This library can not just get into anyone's cloud sync.

In step #2 of the authentication workflow we have to make a request to Nimblebit's servers pretending to be a device. However, if you remember from above, all requests require a playerId playerSs pair - and this one is no different. This is where 'burn bots' come in. A burn bot is simply an account that has been purposefully compromised by having its playerId playerSs pair documented. This is only possibly by watching the network requests made during a new account creation. With the help of the burn bot, we are able to make the required requests to obtain your playerId playerSs pair.

## Configuration

Now that you know what is needed to make API requests to Nimblebit's servers, we can describe with the @tinyburg/core library requires from you. Tinyburg supports the following configuration options:

```js
const defaultConfig: TTConfig = {
    // Where are Nimblebit's API servers
    nimblebitHost: "https://sync.nimblebit.com",

    // AuthProxy options, you shouldn't need to override the proxy address
    proxy: {
        useProxy: true,
        address: "https://authproxy.tinyburg.app",
    },

    // Your friendId, your cloud sync email, and your playerSs (if you know it)
    player: {
        playerId: "",
        playerSs: "" | undefined,
        playerEmail: "" | undefined,
    },
};
```

The playerId field is required for the library to function properly and can be found in the cloud sync menu of the settings. You must provide either your cloud sync email or your playerSs.

### Loading a config

Either pass a config object like the one above to the library.

```js
import tinyburg from "@tinyburg/core";
const client = tinyburg.fromConfig({ ... });
```

or load a saved config from a .json file or db.

```js
import tinybrug from "@tinyburg/core";
import config from "./tinyburgrc.json" assert { type: "json" };
const client = tinybrug.fromConfig(config);
```

### Using without a configuration

Pass your playerId and player email

```js
import tinybrug from "@tinyburg/core";
const client = tinyburg.fromPlayerId("ASD12", "you@example.com");
```

or pass your playerId and playerSs if you know it

```js
import tinybrug from "@tinyburg/core";
const client = tinyburg.fromPlayerId("ASD12", undefined, "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx");
```

or pass your playerId, player email, and playerSs

```js
const tinyburg = require("tinyburg").fromPlayerIdPlayerEmail(
    "ASD12",
    "you@example.com",
    "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
);
```

## Handling Save Data

Save game data coming from Nimblebit's servers has to be decompressed and parsed before it can be interpreted in any meaningful way. Parsing save data into anything meaningful proved quite difficult. In the end, I choose to parse save game data to javascript objects from Nimblebit's custom form. Nimblebit's save data looks something like this:

```js
[key]value[key]
```

and can get more complicated when you have nested blocks. Something like this:

```js
[key1][key2]value2[key2][key3][key4]value4[key4][key5]value5[key5][key3][key1]
```

which should properly be parsed into:

```js
{
    key1: {
        key2: value2,
        key3: {
            key4: value4,
            key5: value5
        }
    }
}
```

oh an sometimes there aren't any `[key]` identifiers for nested keys, so you just have to know the save of the data:

```js
[key1]a,b,1,2,somethingElse,10,-8,anotherThing[key1]
```

which is impossible to parse unless you know what each element represents. It is the responsibility of the save parser to handle parsing saves to and from json. If you are wondering how the actual TinyTower app handlers parsing save game data, it is just a bunch of if statements and they parse each block individually:

```C#
if (saveDataString.hasBlock("key1")) {
    value1 = saveDataString.getBlock("key1");
}
if (saveDataString.hasBlock("key2")) {
    if (saveDataString.hasBlock("key3")) {
        value3 = saveDataString.getAll("key3")
    }
    ...
}
...
```
