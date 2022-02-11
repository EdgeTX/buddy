// Jest ESM bug https://github.com/apollographql/apollo-client/issues/9156
const ESM_BUG_FIX_PACKAGES = [
  "tslib",
  "@apollo/client",
  "react-router-dom",
  "@pothos/core",
  "@pothos/plugin-simple-objects",
];

module.exports = (request, options) => {
  return options.defaultResolver(request, {
    ...options,
    packageFilter: (pkg) => {
      return {
        ...pkg,
        // Alter the value of `main` before resolving the package
        main: ESM_BUG_FIX_PACKAGES.includes(pkg.name)
          ? pkg.module || pkg.main
          : pkg.main,
      };
    },
  });
};
