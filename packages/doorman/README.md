# @tinyburg/doorman

Your friendly TinyTower doorman. Helps you with tasks such as moving bitizens up your elevator, restocking floors, building floors, rebuilding, and much more!

## Goals

-   move bitizens up the elevator
-   restock floors
-   buy floors

## Non-goals

-   enter raffle
-   performance - I am doing this in typescript, I know it is not going to be the fastest

## Architecture

look at the example.sh file to try to get an idea of how this projects is architected. The idea is, remote android emulators which doorman connects to and controls. The systems where the emulators are running are provisioned using ansible, see the playbook.yml file for that. The emulators are managed by avd-compose, see the avd-compose/create-testing-emulator.sh/delete-testing-emulator.sh for that. Doorman is can be deployed as an npm package or using a docker file. If you go the docker route, there are two additional containers that can be deployed alongside doorman to help manage and control the emulator remotely through a browser, see the docker-compose.yml file for that.
