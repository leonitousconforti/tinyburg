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
            files: ["src/endpoints/**/*.ts", "src/save-parser.ts"],
            rules: {
                "no-use-before-define": "off",
                "@typescript-eslint/no-use-before-define": "off",
            },
        },
        {
            files: ["src/closures/**/*.ts"],
            rules: {
                "@typescript-eslint/no-explicit-any": "off",
                "@typescript-eslint/naming-convention": "off",
            },
        },
        {
            files: ["src/parsing-structs/**/*.ts"],
            rules: {
                "@rushstack/typedef-var": "off",
            },
        },
        {
            files: ["src/data/update-common-data.cjs"],
            rules: {
                "unicorn/no-array-callback-reference": "off",
            },
        },
    ],
    ignorePatterns: ["dist/", "src/data/**/*.ts"],
};
