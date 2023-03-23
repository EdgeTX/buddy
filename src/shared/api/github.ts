import { Octokit } from "@octokit/core";
import ky from "ky-universal";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createGithubClient = (auth?: string) => {
  const octokit = new Octokit({
    auth,
    request: {
      fetch: ky,
    },
  });

  return octokit.request;
};

export type GithubClient = ReturnType<typeof createGithubClient>;
