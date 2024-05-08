// This is a workaround for https://github.com/eslint/eslint/issues/3458
require("@rushstack/eslint-config/patch/modern-module-resolution");

module.exports = {
    extends: [
        "@rushstack/eslint-config/profile/node",
        "@rushstack/eslint-config/mixins/tsdoc",
        "plugin:unicorn/recommended",
        "plugin:prettier/recommended",
    ],
    plugins: ["unicorn", "prettier"],
    env: {
        node: true,
        es2022: true,
    },
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json"],
        ecmaVersion: 2020,
        sourceType: "module",
    },
    overrides: [
        {
            files: ["./agent.ts"],
            rules: {
                "@typescript-eslint/explicit-function-return-type": "off",
            },
        },
    ],

    ignorePatterns: ["dist/"],
};
