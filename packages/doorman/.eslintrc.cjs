// This is a workaround for https://github.com/eslint/eslint/issues/3458
require("@rushstack/eslint-config/patch/modern-module-resolution");

module.exports = {
    extends: ["@rushstack/eslint-config/profile/node"],
    env: {
        node: true,
        es2022: true,
    },
    parser: "@typescript-eslint/parser",
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
        "@typescript-eslint/explicit-function-return-type": "off",
    },
    overrides: [
        {
            files: ["templates/*.ts"],
            rules: {
                "@rushstack/typedef-var": "off",
            },
        },
    ],
    ignorePatterns: ["dist/", "proto/generated/", ".eslintrc.cjs"],
};
