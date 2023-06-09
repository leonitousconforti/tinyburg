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
        project: ["./tsconfig.json", "./tsconfig.base.json"],
        ecmaVersion: 2022,
        sourceType: "module",
    },
    rules: {
        indent: ["error", 4, { SwitchCase: 1 }],
    },
    overrides: [
        {
            files: ["./src/agents/*.ts", "./examples/*/*agent*.*"],
            rules: {
                "@typescript-eslint/explicit-function-return-type": "off",
            },
        },
    ],
    ignorePatterns: ["dist/"],
};
