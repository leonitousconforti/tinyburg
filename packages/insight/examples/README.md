# @tinyburg/insight examples

There are examples for typescript, javascript using jsDoc comments for type safety, and plain vanilla javascript without any type safety. If you are already using typescript, then adding types for @tinyburg/insight to your application is just one interface and is pretty simple. Using jsDoc comments in javascript requires a bit more work, but not much. I would recommend that if you are using javascript, you try to use jsDoc comments because they will save you from some runtime errors that can be prevented and just make your life easier overall. However, if you really don't feel up to using jsDoc comments/types in typescript, they are optional and you won't loose any functionality.

Each example has multiple agents to showcase all the different things you can do with @tinyburg/insight. There will be an example agent just called 'agent' which has some details about how agents work in general, the comments on this agent are omitted in the other agents for shortness. I would recommend you start by reading and trying to understand the simple agent before looking at the other agents. There will be an example for how to get a value from the game, think like the number of coins a player has or all the bitizens in their tower. There will be an example for how to set a value in the game, think like the number of coins a player has or setting the floors in a tower. There will be two examples showing how to "subscribe" or "alert" to changes in game. The first alert example uses a callback method, which works well if you are only tracking one thing - i.e when a bitizen arrives at the elevator. The second alter example uses an event emitter which emits events as they happen, this is ideal if you are tracking multiple things using the same agent - i.e the number of coins, bux, energy, and gold tickets the player has. Since these are all properties on the player class, it makes sense to track them all using the same agent, and thus instead of having four callback methods or just have additional parameters to the callback method, you can use an event emitter. Neither solution is right or wrong, but I do think that they are better suited for different things.

## Running examples

for the js/js-typed examples:

```bash
node index.js
```

and for the ts example:

```bash
ts-node index.ts
```
