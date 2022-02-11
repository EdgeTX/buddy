require("ts-node").register({
  compilerOptions: { module: "commonjs", baseUrl: "./src" },
  swc: true,
});
module.exports = require("./src/shared/backend/schema.ts");
