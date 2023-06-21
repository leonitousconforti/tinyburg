import architect from "./index.js";

describe("simple testing", () => {
    it(
        "Should be true",
        async () => {
            const { container } = await architect({
                withAdditionalServices: false,
                dockerConnectionOptions: {
                    protocol: "ssh",
                    host: "architect01.tinyburg.app",
                    port: 22,
                    username: "root",
                    // @ts-ignore
                    password: "o2(U_}pz6ycJsmLy",
                },
            });
            console.log(container.id);
            expect(true).toBeTruthy();
        },
        1000 * 60 * 5
    );
});
