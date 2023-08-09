"use strict";

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");

function createWebpackConfig({ production }) {
    const webpackConfig = {
        mode: production ? "production" : "development",
        resolve: {
            extensions: [".js", ".jsx", ".json"],
        },
        module: {
            rules: [
                {
                    test: /\.css$/,
                    use: [require.resolve("style-loader"), require.resolve("css-loader")],
                },
                {
                    test: /\.js$/,
                    enforce: "pre",
                    use: ["source-map-loader"],
                },
            ],
        },
        entry: {
            app: path.join(__dirname, "dist", "index.js"),
            vendor: ["react", "react-dom"],
        },
        output: {
            path: path.join(__dirname, "build"),
            filename: "[name]_[contenthash].js",
        },
        performance: {
            maxEntrypointSize: 512000,
            maxAssetSize: 512000,
        },
        devServer: {
            port: 8084,
            compress: true,
            static: {
                directory: path.join(__dirname, "public"),
            },
        },
        devtool: production ? undefined : "source-map",
        plugins: [
            new HtmlWebpackPlugin({
                template: "public/index.html",
            }),
        ],
    };

    return webpackConfig;
}

module.exports = createWebpackConfig;
