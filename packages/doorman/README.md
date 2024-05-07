# @tinyburg/doorman

Your friendly TinyTower doorman. Helps you with tasks such as moving bitizens up your elevator, restocking floors, building floors, rebuilding, and much more!

## Goals

-   rebuild
-   buy floors
-   tech tree upgrades
-   fulfill airport shipments
-   upgrade the elevator speed
-   dismiss bitbook notifications
-   restock floors and upgrade floors
-   unlock roofs, elevators, and lobbies
-   move bitizens up the elevator to their desired floors
-   Expose interfaces for implementing more complex handlers using something like @tinyburg/bitprints
-   Use only video processing, no hooking into the game memory using frida (shouldn't be able to tell that this is a bot)
-   Implement all image processing algorithms myself, no using opencv (I want to learn how they work and what they do)

## Non-goals

-   enter raffle
-   performance (I am doing this in typescript, I know it is not going to be the fastest)
-   Decision making

@tinyburg/doorman's main goals can be summarized as performing actions in game (press elevator notification then move bitizen to desired floor), processing and relaying global game state (you now have x coins, y bux, ect), and providing interfaces and abstractions to promote easy extension by others so you can build your own custom handlers to do whatever you want! Doorman is really good at specifying HOW something gets done, but it will never control WHEN something gets done. If you want to build a complex game strategy that requires reacting to changes in game state and then performing actions you should consider using @tinyburg/bitprints to build your game strategy and then pass the generated blueprint to doorman.
