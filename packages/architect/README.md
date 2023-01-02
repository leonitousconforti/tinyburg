# @tinyburg/architect

Architect is a tool for creating/designing an environment for TinyTower to run in. Other tinyburg packages that rely on an instance of the game, wether for testing purposes or to extract information, will use architect to bring up an instance of the game and connect to it. This removes the barrier of needing a real rooted android device to test.

# How?

Architect leverages the android studio emulator from the android sdk. Why not use Bluestacks or Genymotion? Because the android studio emulator has an api for interacting with it, is easy to install and configure, and it can run on almost any machine (only one I could get running on both my desktop and my m1 mac laptop, which is very important for me). The emulator api can be used to interact with the emulator and thus the game itself, removing a lot of work that would have to be done for managing multiple on the same machine. I wanted to run a lot of these on one machine, and this way I don't have to write code to make sure that every window has its own region of the screen and this is where it needs to move the mouse for this window, ect. Instead, packages like @tinyburg/doorman and @tinyburg/insight can just directly communicate with the emulator, there is no need for the emulator window to be even visible on the display.

## Where can architect run TinyTower

-   Local docker host (linux only hosts)
-   Remote docker host (using ssh or exposed docker daemon, linux only hosts)
-   Local machine (android command line tools must be installed)
-   Remote machine over ssh (android command line tools must be installed)

## Caveats to keep in mind

-   In the docker cases, the HOST operating system where docker is running must be linux
-   In the local and ssh cases, the machine must have android command line tools installed and the ANDROID_HOME environment variable set
-   In ALL cases, wether in docker or not, the HOST machine must have kvm acceleration available
