import architect from "./index.js";

describe("simple test", () => {
    it(
        "Should be able to create a container without additional services",
        async () => {
            const { container } = await architect({
                withAdditionalServices: false,
                dockerConnectionOptions: {
                    protocol: "ssh",
                    host: "architect02.tinyburg.app",
                    port: 22,
                    username: "root",
                },
            });
            expect(container.id).toBeDefined();
            await container.stop();
            await container.remove();
        },
        1000 * 60 * 5
    );

    it(
        "Should be able to create a container with additional services",
        async () => {
            const { container } = await architect({
                withAdditionalServices: true,
                dockerConnectionOptions: {
                    protocol: "ssh",
                    host: "architect02.tinyburg.app",
                    port: 22,
                    username: "root",
                },
            });
            expect(container.id).toBeDefined();
            await container.stop();
            await container.remove();
        },
        1000 * 60 * 5
    );
});
