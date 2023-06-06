// This is a workaround for https://github.com/eslint/eslint/issues/3458
require("@rushstack/eslint-config/patch/modern-module-resolution");

module.exports = {
    extends: [
        "@rushstack/eslint-config/profile/web-app",
        "@rushstack/eslint-config/mixins/react",
        "plugin:prettier/recommended",
    ],
    plugins: ["prettier"],
    parserOptions: {
        tsconfigRootDir: __dirname,
        project: ["./tsconfig.json"],
        ecmaVersion: 2022,
        sourceType: "module",
    },
    ignorePatterns: ["build/", "dist/", "webpack.config.cjs", ".eslintrc.cjs"],
};
