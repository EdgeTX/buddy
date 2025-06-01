// ----------------------------------------------------------------
// src/shared/api/github.ts
// ----------------------------------------------------------------

import { Octokit } from "@octokit/core";
import ky from "ky";

/**
 * We want to polyfill `AbortSignal.any(...)` in environments
 * where it doesn’t exist natively (e.g. Node <18).  By declaring
 * a single `type AbortSignalStatic` (the “static side” of AbortSignal
 * plus an `any(...)` method), we avoid creating an empty interface
 * or namespace, and we sidestep duplicate‐identifier errors.
 */
type AbortSignalStatic = typeof AbortSignal & {
  any(signals: AbortSignal[]): AbortSignal;
};

const AbortSignalPoly = AbortSignal as AbortSignalStatic;

if (typeof AbortSignalPoly.any !== "function") {
  AbortSignalPoly.any = (signals: AbortSignal[]): AbortSignal => {
    const controller = new AbortController();

    // Use forEach (no for...of) to satisfy ESLint’s no-restricted-syntax:
    signals.forEach((sig) => {
      if (sig.aborted) {
        controller.abort();
      } else {
        sig.addEventListener(
          "abort",
          () => {
            controller.abort();
          },
          { once: true }
        );
      }
    });

    return controller.signal;
  };
}

/**
 * We capture the exact type of `octokit.request` here by using
 * `typeof Octokit.prototype.request`.  That is our GithubClient.
 */
export type GithubClient = typeof Octokit.prototype.request;

/**
 * Creates a GitHub “request” function configured with `ky` under the hood.
 *
 * @param auth  – optional personal‐access token (or other auth string).
 * @returns     – exactly `octokit.request`, typed as `GithubClient`.
 */
export const createGithubClient = (auth?: string): GithubClient => {
  const octokit = new Octokit({
    auth,
    request: {
      fetch: ky,
    },
  });

  return octokit.request;
};
