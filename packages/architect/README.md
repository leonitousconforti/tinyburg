# @tinyburg/architect

Architect is responsible for designing an environment for TinyTower to run in. Other tinyburg packages that rely on an instance of the game, wether for testing or to extract information, will use architect to bring up an instance of the game and connect to it.

## Where can architect run TinyTower

-   Local docker host (linux only hosts)
-   Remote docker host (using ssh or exposed docker daemon, linux only hosts)
-   Local machine (android sdk must be installed)
-   Remote machine over ssh (android sdk must be installed)

## Caveats to keep in mind

-   In the docker cases, the HOST operating system where docker is running must be linux
-   In the local cases, the machine must have the android sdk already installed and available in PATH
-   In all cases, wether in docker or not, the host machine must have kvm acceleration available
