# @tinyburg/insight

@tinyburg/insight is a typescript package that provides information into and about TinyTower using frida. See https://frida.re/docs/home/ to learn more about frida. It is customizable and highly extensible.

## Features

-   support for native js (typescript is optional)
-   extensible (roll your own agents to do whatever you want)
-   type safety (optional, but it really helps prevent pesky runtime errors)
-   agents are compiled at runtime (no additional build/bundle steps needed)
-   platform agnostic

### Why are agents compiled at runtime?

Agents are compiled at runtime because I still wanted to support javascript without the need to build/bundle agents ahead of time. I also felt that the need to manually build/bundle agents with an external tool would be a big barrier to entry for other developers interested in using the library. Because agents are built/bundled at runtime, there is a quicker turn around time and you can develope agents much faster.

### How does @tinyburg/insight provide type safety without a build/bundle step?

One might wonder this, and the answer is that type safety is built into the insight but it is optional. Insight relies on your editor to notify you of any type errors assuming that you provide types. This works really well.

## Use cases

The information retrieved by the agents in this library is used to generate data in the @tinyburg/core library! Data on all bitbook posts, bitizens, costumes, elevators, floors, missions, pets, and roofs is retrieved. These agents are written in such a way that they shouldn't have to change when a new version of TinyTower is released.

## Examples

there are a couple of examples to help get you started using @tinyburg/insight. The ts examples shows you how to write an agent in typescript and then run it, the js-typed example showcases how to write an agent in js and still utilize the safety of types through jsDoc comments. Finally, the js example showcases how to write an agent in vanilla javascript without any type safety.

## How does @tinyburg/insight benefit from types?

because frida agents are compiled at runtime and not as part of a build process, it makes it difficult to ensure that the agent exposes the expected properties over the remote procedure call channel. This can lead to lots of runtime errors when you try to call something on the agent from node that doesn't exists because it is spelt wrong or has the wrong type.

How does insight try to solve this? By using typescript or jsDoc to type check the agent against your code. This increases complexity slightly for javascript because you have to write a couple (2) jsDoc comments to tie everything together, but if you are already using typescript there really isn't much to do but define an extra interface.

When bootstrapping an agent, you must pass an object that satisfies the following typescript type:

```ts
export interface IAgent {
    agentFile: string;
    rpcTypes: {
        main: TAgentMain<any[], unknown>;
        mainProducesSourceCode?: boolean;
    };
}
```

As shown above, not only are you expected to pass the location to the agent, but also its rpcTypes (if you want type checking, you can omit it if you just want to use plain js without type checking). The examples go into great detail for how to accomplish this.
