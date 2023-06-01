// This is a workaround for https://github.com/eslint/eslint/issues/3458
require("@rushstack/eslint-config/patch/modern-module-resolution");

module.exports = {
    extends: [
        "@rushstack/eslint-config/profile/node",
        "@rushstack/eslint-config/mixins/tsdoc",
        "plugin:prettier/recommended",
        "plugin:unicorn/recommended",
        "react-app",
    ],
    plugins: ["prettier", "unicorn"],
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
    rules: {
        indent: ["error", 4, { SwitchCase: 1 }],
        "unicorn/no-nested-ternary": "off",
        "unicorn/prefer-node-protocol": "off",
        "unicorn/prevent-abbreviations": "off",
        "unicorn/filename-case": [
            "error",
            {
                case: "pascalCase",
            },
        ],
    },
    ignorePatterns: ["build/", "src/generated/", "webpack.config.cjs", ".eslintrc.cjs"],
};
