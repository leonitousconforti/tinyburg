import * as Effect from "effect/Effect";

import * as MobyApi from "the-moby-effect";
import type { IArchitectPortBindings } from "./0-shared-options.js";

/** The endpoints that an architect container has. */
export interface IArchitectEndpoints {
    dockerHostAddress: string;
    emulatorContainerAddress: string | undefined;
    adbConsoleAddress: string;
    adbAddress: string;
    grpcAddress: string;
    fridaAddress: string;
    envoyAdminAddress: string;
    envoyGrpcWebAddress: string;
    mitmWebInterfaceAddress: string;
}

export type IExposedArchitectEndpoints =
    | [usingHostNetworking: IArchitectEndpoints]
    | [usingHostNetworking: IArchitectEndpoints, usingContainersIPv4Networking: IArchitectEndpoints];

/**
 * Retrieves all the endpoints exposed by the container. If the endpoints are
 * meant to be consumed in a browser, they will be prefixed with "http" or
 * "https" appropriately. Application endpoints will have no prefix.
 */
export const getExposedEmulatorEndpoints = ({
    dockerHostAddress,
    emulatorContainer,
}: {
    dockerHostAddress: string;
    emulatorContainer: MobyApi.Schemas.ContainerInspectResponse;
}): Effect.Effect<IExposedArchitectEndpoints, never, never> =>
    Effect.gen(function* () {
        const emulatorContainerAddress: string | undefined = emulatorContainer.NetworkSettings?.IPAddress || undefined;

        // This is the port bindings the emulator container exposes
        const exposedEmulatorContainerPorts: IArchitectPortBindings =
            emulatorContainer.HostConfig?.NetworkMode === "host"
                ? ({
                      "5554/tcp": [{ HostPort: "5554" }],
                      "5555/tcp": [{ HostPort: "5555" }],
                      "8080/tcp": [{ HostPort: "8080" }],
                      "8081/tcp": [{ HostPort: "8081" }],
                      "8554/tcp": [{ HostPort: "8554" }],
                      "8555/tcp": [{ HostPort: "8555" }],
                      "27042/tcp": [{ HostPort: "27042" }],
                  } satisfies IArchitectPortBindings)
                : (emulatorContainer.NetworkSettings?.Ports as unknown as IArchitectPortBindings);

        // How to reach these endpoints over the docker host's networking
        const exposedEndpointsUsingHostsNetworking: IArchitectEndpoints = {
            dockerHostAddress,
            emulatorContainerAddress,
            adbConsoleAddress: `${dockerHostAddress}:${exposedEmulatorContainerPorts["5554/tcp"][0].HostPort}`,
            adbAddress: `${dockerHostAddress}:${exposedEmulatorContainerPorts["5555/tcp"][0].HostPort}`,
            mitmWebInterfaceAddress: `http://${dockerHostAddress}:${exposedEmulatorContainerPorts["8080/tcp"][0].HostPort}`,
            envoyAdminAddress: `http://${dockerHostAddress}:${exposedEmulatorContainerPorts["8081/tcp"][0].HostPort}`,
            grpcAddress: `${dockerHostAddress}:${exposedEmulatorContainerPorts["8554/tcp"][0].HostPort}`,
            envoyGrpcWebAddress: `http://${dockerHostAddress}:${exposedEmulatorContainerPorts["8555/tcp"][0].HostPort}`,
            fridaAddress: `${dockerHostAddress}:${exposedEmulatorContainerPorts["27042/tcp"][0].HostPort}`,
        };

        // How to reach these endpoints over the docker container's networking
        const exposedEndpointsUsingContainersNetworking: IArchitectEndpoints = {
            dockerHostAddress,
            emulatorContainerAddress,
            adbConsoleAddress: `${emulatorContainerAddress}:${exposedEmulatorContainerPorts["5554/tcp"][0].HostPort}`,
            adbAddress: `${emulatorContainerAddress}:${exposedEmulatorContainerPorts["5555/tcp"][0].HostPort}`,
            mitmWebInterfaceAddress: `http://${emulatorContainerAddress}:${exposedEmulatorContainerPorts["8080/tcp"][0].HostPort}`,
            envoyAdminAddress: `http://${emulatorContainerAddress}:${exposedEmulatorContainerPorts["8081/tcp"][0].HostPort}`,
            grpcAddress: `${emulatorContainerAddress}:${exposedEmulatorContainerPorts["8554/tcp"][0].HostPort}`,
            envoyGrpcWebAddress: `http://${emulatorContainerAddress}:${exposedEmulatorContainerPorts["8555/tcp"][0].HostPort}`,
            fridaAddress: `${emulatorContainerAddress}:${exposedEmulatorContainerPorts["27042/tcp"][0].HostPort}`,
        };

        /**
         * If the container is using host networking, only provide endpoints
         * accessible over the docker host's networking. Otherwise provide both
         * endpoints accessible over the docker host's networking and the docker
         * container's networking.
         */
        const endpointsToReturn: IExposedArchitectEndpoints =
            emulatorContainer.HostConfig?.NetworkMode === "host"
                ? [exposedEndpointsUsingHostsNetworking]
                : [exposedEndpointsUsingHostsNetworking, exposedEndpointsUsingContainersNetworking];

        yield* Effect.log(`Host networking container endpoints are: ${JSON.stringify(endpointsToReturn[0])}`);
        yield* Effect.log(`Container ipv4 networking endpoints are: ${JSON.stringify(endpointsToReturn[1])}`);
        return endpointsToReturn;
    });
