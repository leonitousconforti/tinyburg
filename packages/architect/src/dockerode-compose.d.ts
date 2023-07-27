declare module "dockerode-compose" {
    type Dockerode = import("dockerode");

    export default class DockerodeCompose {
        constructor(dockerode: Dockerode, file: string, projectName: string);

        down(options?: { volumes?: boolean }): Promise<{
            file: string;
            services: Dockerode.Container[];
            networks: Dockerode.Network[];
            volumes?: Dockerode.Volume[];
        }>;

        up(options?: { verbose?: boolean }): Promise<{
            file: string;
            secrets: Record<string, unknown>;
            volumes: Dockerode.Volume[];
            configs: Record<string, unknown>;
            networks: Dockerode.Network[];
            services: Dockerode.Container[];
        }>;

        pull(
            serviceName?: string,
            options?: { verbose?: boolean; streams?: boolean }
        ): Promise<NodeJS.ReadableStream[]>;
    }
}
