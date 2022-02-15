const languages = require("./locales/languages.json");

module.exports = {
  defaultNamespace: "common",

  indentation: 2,
  keepRemoved: false,

  // see below for more details
  lexers: {
    tsx: ["JsxLexer"],
  },

  lineEnding: "auto",
  locales: languages.filter((lang) => lang !== "en"),
  namespaceSeparator: false,
  keySeparator: false,

  output: "locales/$LOCALE/$NAMESPACE.json",
  sort: true,
  useKeysAsDefaultValue: true,
  verbose: false,
  failOnWarnings: false,

  failOnUpdate: process.env.CI,
};
