const { TsconfigPathsPlugin } = require("tsconfig-paths-webpack-plugin");
const WebpackBar = require("webpackbar");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { ESBuildMinifyPlugin } = require("esbuild-loader");
const tsconfig = require("../tsconfig.json");
const webpack = require("webpack");
const path = require("path");

module.exports = (_, { mode }) => ({
  mode: mode || "development",
  entry: {
    main: "./src/main/index.ts",
    preload: "./src/main/preload.ts",
  },
  target: "electron16.0-main",
  resolve: {
    extensions: [".ts", ".mjs", ".js", ".node"],
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.join(__dirname, "../tsconfig.json"),
      }),
    ],
  },
  externals: [
    {
      bufferutil: "commonjs bufferutil",
    },
  ],
  experiments: {
    topLevelAwait: true,
  },
  node: {
    __filename: false,
    __dirname: false,
  },
  module: {
    rules: [
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false,
        },
      },
      {
        test: /\.tsx?$/,
        loader: "esbuild-loader",
        options: {
          loader: "ts",
          tsconfigRaw: tsconfig,
          target: tsconfig.compilerOptions.target.toLowerCase(),
        },
      },
      {
        test: /\.node$/,
        loader: "native-ext-loader",
      },
      {
        test: /\.js$/,
        loader: "node-bindings-loader",
      },
    ],
  },
  output: {
    path: `${__dirname}/../build/main`,
    clean: true,
    chunkFormat: "commonjs",
  },
  optimization: {
    minimize: mode === "production",
    minimizer: [
      new ESBuildMinifyPlugin({
        target: tsconfig.compilerOptions.target.toLowerCase(),
      }),
    ],
  },

  plugins: [
    new WebpackBar({
      name: "main",
      color: "yellow",
    }),
    new webpack.IgnorePlugin({
      resourceRegExp:
        /cdn.jsdelivr.net\/npm\/web-streams-polyfill@3\/dist\/ponyfill.es2018.mjs/,
    }),
    new webpack.DefinePlugin({
      "process.env": JSON.stringify({
        // If the build env knows the proxy url, use that, otherwise
        // default to our local cors proxy
        PROXY_URL: process.env.PROXY_URL ?? "http://localhost:12000",
        GITHUB_API_KEY: process.env.GITHUB_API_KEY,
      }),
    }),
    ...(process.env.REPORT
      ? [
          new BundleAnalyzerPlugin({
            analyzerMode: "static",
            reportFilename: "main-report.html",
            openAnalyzer: false,
          }),
        ]
      : []),
  ],
  devtool: "source-map",
  // make it so we don't bundle the API server, or dev-tools if compiling
  ...(mode === "production"
    ? {
        externals: {
          "@betaflight/api-server": "commonjs @betaflight/api-server",
          "electron-devtools-installer": "commonjs electron-devtools-installer",
        },
      }
    : {}),
});
