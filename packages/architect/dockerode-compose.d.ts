declare module "dockerode-compose" {
    type Dockerode = import("dockerode");

    export default class DockerodeCompose {
        constructor(dockerode: Dockerode, file: string, projectName: string);

        down(options?: { volumes?: boolean }): Promise<{
            file: string;
            services: Record<string, unknown>;
            networks: Record<string, unknown>;
            volumes?: Record<string, unknown>;
        }>;

        up(options?: { verbose?: boolean }): Promise<{
            file: string;
            secrets: Record<string, unknown>;
            volumes: Record<string, unknown>;
            configs: Record<string, unknown>;
            networks: Record<string, unknown>;
            services: Record<string, unknown>;
        }>;

        pull(
            serviceName?: string,
            options?: { verbose?: boolean; streams?: boolean }
        ): Promise<NodeJS.ReadableStream[]>;
    }
}
