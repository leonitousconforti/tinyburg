"use strict";

const path = require("path");
const sass = require("node-sass");
const Autoprefixer = require("autoprefixer");
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
                    test: /\.(scss|sass|css)$/,
                    exclude: /node_modules/,
                    use: [
                        "style-loader",
                        {
                            loader: "css-loader",
                            options: {
                                importLoaders: 2,
                                modules: true,
                            },
                        },
                        {
                            loader: "postcss-loader",
                            options: {
                                postcssOptions: {
                                    plugins: [new Autoprefixer()],
                                },
                            },
                        },
                        {
                            loader: "sass-loader",
                            options: {
                                implementation: sass,
                                sassOptions: {
                                    includePaths: [path.resolve(__dirname, "node_modules")],
                                },
                            },
                        },
                    ],
                },
                {
                    test: /\.(svg|png|jpe?g|gif)$/i,
                    loader: "file-loader",
                },
            ],
        },
        entry: {
            app: path.join(__dirname, "build", "index.js"),
            vendor: ["react", "react-dom"],
        },
        output: {
            path: path.join(__dirname, "build"),
            filename: "[name]_[contenthash].js",
        },
        performance: {
            maxEntrypointSize: 250000,
            maxAssetSize: 250000,
        },
        devtool: production ? undefined : "source-map",
        plugins: [
            new HtmlWebpackPlugin({
                template: "public/index.html",
            }),
        ],
        devServer: {
            static: {
                directory: path.join(__dirname, "public"),
            },
            compress: true,
        },
    };

    return webpackConfig;
}

module.exports = createWebpackConfig;
