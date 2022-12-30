// This is a workaround for https://github.com/eslint/eslint/issues/3458
require("@rushstack/eslint-config/patch/modern-module-resolution");

module.exports = {
    extends: ["@rushstack/eslint-config/profile/node"],
    env: {
        node: true,
        es2022: true,
    },
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.*.json", "./tsconfig.json"],
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        indent: ["error", 4, { SwitchCase: 1 }],
        "linebreak-style": ["error", "unix"],
        quotes: ["error", "double"],
        semi: ["error", "always"],
        "@rushstack/typedef-var": "off",
    },
    overrides: [
        {
            files: ["src/data/bitbookPosts.ts", "src/data/missions.ts"],
            rules: {
                quotes: "off",
                "@typescript-eslint/naming-convention": "off",
            },
        },
    ],
    ignorePatterns: ["dist/"],
};
