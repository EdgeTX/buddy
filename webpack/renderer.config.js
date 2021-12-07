const { TsconfigPathsPlugin } = require("tsconfig-paths-webpack-plugin");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const ForkTsCheckerWebpackPlugin = require("fork-ts-checker-webpack-plugin");
const openBrowser = require("react-dev-utils/openBrowser");
const { BundleAnalyzerPlugin } = require("webpack-bundle-analyzer");
const { ESBuildMinifyPlugin } = require("esbuild-loader");
const WebpackBar = require("webpackbar");
const webpack = require("webpack");
const { spawn } = require("child_process");
const tsconfig = require("../tsconfig.json");
const path = require("path");

module.exports = (_, { mode }) => ({
  target: "es2020",
  mode: mode || "development",
  entry: [
    ...(mode !== "production" ? ["react-dev-utils/webpackHotDevClient"] : []),
    "./src/renderer/index.tsx",
  ],
  watchOptions: {
    ignored: ["build/**/*"],
  },
  externals: {
    "node-fetch": {},
    got: "commonjs got",
    "get-stream": "commonjs get-stream",
    "supports-color": "commonjs supports-color",
  },
  experiments: {
    topLevelAwait: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".mjs", ".js"],
    fallback: {
      tty: false,
      util: false,
      path: false,
      process: false,
      url: false,
      os: false,
      buffer: false,
    },
    plugins: [
      new TsconfigPathsPlugin({
        configFile: path.join(__dirname, "../tsconfig.json"),
      }),
    ],
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
          loader: "tsx",
          tsconfigRaw: tsconfig,
          target: tsconfig.compilerOptions.target.toLowerCase(),
        },
      },
      {
        test: /\.svg$/,
        use: [
          {
            loader: "react-svg-loader",
            options: {
              svgo: {
                plugins: [
                  {
                    removeViewBox: false,
                  },
                  {
                    cleanupIDs: false,
                  },
                ],
              },
            },
          },
        ],
      },
      {
        test: /\.(png|jpg|jpeg|gif)$/i,
        type: "asset/inline",
      },
      {
        test: /\.(ico|gif|eot|otf|webp|ttf|woff|woff2|cur|ani|gltf)(\?.*)?$/,
        type: "asset/resource",
      },
    ],
  },
  output: {
    path: `${__dirname}/../build/renderer`,
    chunkFormat: "array-push",
    chunkLoading: "jsonp",
    workerChunkLoading: "import-scripts",
  },
  optimization: {
    minimize: mode === "production",
    minimizer: [
      new ESBuildMinifyPlugin({
        target: tsconfig.compilerOptions.target.toLowerCase(),
      }),
    ],
    usedExports: true,
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: "process/browser",
      Buffer: ["buffer", "Buffer"],
    }),
    new webpack.DefinePlugin({
      "process.env": JSON.stringify({
        // If the build env knows the proxy url, use that, otherwise
        // default to our local cors proxy
        PROXY_URL: process.env.PROXY_URL ?? "http://localhost:12000",
      }),
    }),
    new HtmlWebpackPlugin({
      template: "./src/renderer/index.html",
    }),
    // Only typecheck in production
    new ForkTsCheckerWebpackPlugin({
      typescript: {
        reportFiles: ["src/**/*.{ts,tsx}"],
      },
      issue: {
        exclude: [
          {
            origin: "typescript",
            file: "src/**/*.spec.{ts,tsx}",
          },
        ],
      },
    }),
    new WebpackBar({
      name: "renderer",
    }),
    ...(process.env.REPORT
      ? [
          new BundleAnalyzerPlugin({
            analyzerMode: "static",
            reportFilename: "renderer-report.html",
            openAnalyzer: false,
          }),
        ]
      : []),
  ],
  devtool: "source-map",
  devServer: {
    hot: true,
    onAfterSetupMiddleware() {
      openBrowser("http://localhost:8080");
      if (!process.env.WEB_ONLY) {
        spawn("electron", ["./build/main/main.js"], {
          shell: true,
          env: {
            NODE_ENV: "development",
            ...process.env,
          },
          stdio: "inherit",
        })
          .on("close", () => process.exit(0))
          // eslint-disable-next-line no-console
          .on("error", (spawnError) => console.error(spawnError));
      }
    },
  },
});
