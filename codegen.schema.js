require("ts-node").register({
  compilerOptions: { module: "commonjs", baseUrl: "./src" },
  transpileOnly: true,
});
module.exports = require("./src/shared/backend/graph").schema;
