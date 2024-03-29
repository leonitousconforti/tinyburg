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
        ecmaVersion: 2022,
        sourceType: "module",
    },
    overrides: [
        {
            files: ["src/routes/types/*.ts"],
            rules: { "unicorn/filename-case": "off" },
        },
        {
            files: ["src/proxy.ts"],
            rules: {
                "@rushstack/typedef-var": "off",
                "@typescript-eslint/naming-convention": "off",
            },
        },
    ],
    rules: {
        "dot-notation": "off",
        "unicorn/no-useless-undefined": "off",
        "require-atomic-updates": ["error", { allowProperties: true }],
    },
    ignorePatterns: ["dist/"],
};
