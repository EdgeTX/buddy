import environment from "./environment";

const E2E = process.env.E2E === "true";
const PRODUCTION = process.env.NODE_ENV === "production";

const extractParam = (key: string): string | null =>
  !environment.isMain && !environment.isWebworker
    ? new URLSearchParams(window.location.search.slice(1)).get(key)
    : null;

const getGithubToken = (): string | undefined => {
  // If you need the API key to record new APIs, change this
  // line. The github API limits are 50/hour you should be ok
  // when writing tests
  if (process.env.NODE_ENV === "test") {
    return undefined;
  }

  return environment.isMain
    ? process.env.GITHUB_TOKEN
    : extractParam("github-token") ?? undefined;
};

export default {
  isProduction: PRODUCTION,

  // These are not accessable inside of web worker. Everywhere else they are ok to use
  startParams: {
    isE2e: environment.isMain ? E2E : extractParam("e2e") === "true",
    isMocked: environment.isMain
      ? process.env.MOCKED === "true"
      : extractParam("mocked") === "true",
    isNewUI: extractParam("next") === "true",
    githubToken: getGithubToken(),
  },
};
