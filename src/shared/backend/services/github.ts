import { Octokit } from "@octokit/core";
import ky from "ky-universal";
import config from "shared/config";

const octokit = new Octokit({
  auth: config.github.apiKey,
  request: {
    fetch: ky,
  },
});

export const github = octokit.request;
