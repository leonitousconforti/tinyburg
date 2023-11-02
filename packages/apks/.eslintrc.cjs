// This is a workaround for https://github.com/eslint/eslint/issues/3458
require("@rushstack/eslint-config/patch/modern-module-resolution");

module.exports = {
    extends: [
        "@rushstack/eslint-config/profile/node",
        "@rushstack/eslint-config/mixins/tsdoc",
        "@rushstack/eslint-config/mixins/friendly-locals",
        "plugin:unicorn/recommended",
        "plugin:@effect/recommended",
        "plugin:prettier/recommended",
    ],
    plugins: ["unicorn", "prettier"],
    env: { node: true, es2022: true },
    parserOptions: { tsconfigRootDir: __dirname, project: ["./tsconfig.json"] },
    rules: {
        "no-console": "warn",
        "@effect/dprint": "off",
        "unicorn/no-array-callback-reference": ["off"],
        "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
        "@typescript-eslint/naming-convention": [
            "error",
            { format: null, selector: "parameter", filter: { regex: "^_", match: false } },
        ],
    },
    overrides: [
        {
            files: ["src/download-latest-apks.cjs"],
            rules: { "@typescript-eslint/naming-convention": "off" },
        },
    ],
    ignorePatterns: ["dist/", "temp/"],
};
