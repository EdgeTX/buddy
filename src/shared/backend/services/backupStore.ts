import md5 from "md5";
import { ZipInfoRaw, unzipRaw } from "unzipit";
import ZipHTTPRangeReader from "shared/backend/utils/ZipHTTPRangeReader";
import ky from "ky";
import config from "shared/backend/config";
import { uniqueBy } from "shared/tools";
import { GithubClient } from "shared/api/github";

export type Target = {
  name: string;
  code: string;
};

type BackupFile = {
  targets: [string, string][];
};

const backupBundleBlobs: Record<string, Promise<Blob>> = {};

const backupTargetsCache: Record<string, Promise<Target[]>> = {};

const backupBundle = async (url: string): Promise<ZipInfoRaw> => {
  // For github action related assets we can't use Range reads :(
  const reader = url.includes("api.github.com")
    ? await (async () => {
        if (!backupBundleBlobs[url]) {
          backupBundleBlobs[url] = ky(url, {
            headers: {
              Authorization: config.github.prBuildsKey
                ? `token ${config.github.prBuildsKey}`
                : undefined,
            },
          })
            .then((res) => res.arrayBuffer())
            .then((buffer) => new Blob([buffer]));
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        return backupBundleBlobs[url]!;
      })()
    : new ZipHTTPRangeReader(url);

  return unzipRaw(reader);
};

export const backupTargets = async (
  backupBundleUrl: string
): Promise<Target[]> => {
  if (!backupTargetsCache[backupBundleUrl]) {
    backupTargetsCache[backupBundleUrl] = (async () => {
      try {
        const { entries } = await backupBundle(backupBundleUrl);
        const backupFile = entries.find((entry) =>
          entry.name.endsWith("fw.json")
        );

        if (!backupFile) {
          delete backupTargetsCache[backupBundleUrl];
          throw new Error("Could not find backup metadata file");
        }

        const data = (await backupFile.json()) as BackupFile;

        return uniqueBy(
          data.targets.map(([name, code]) => ({
            name,
            code: code.slice(0, code.length - 1),
          })),
          "code"
        );
      } catch (e) {
        delete backupTargetsCache[backupBundleUrl];
        throw e;
      }
    })();
  }

  // We have to have just assigned this
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return backupTargetsCache[backupBundleUrl]!;
};

const backupFileNameToId = (fileName: string): string => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const withoutExtension = fileName.split("/").pop()!.replace(".bin", "");
  const withoutCommitHash = withoutExtension.split("-").slice(0, -1).join("-");

  return withoutCommitHash;
};

export const fetchBackup = async (
  backupBundleUrl: string,
  target: string
): Promise<Buffer> => {
  const { entries } = await backupBundle(backupBundleUrl);
  const backupFile = entries.find(
    (entry) =>
      entry.name.endsWith(".bin") && backupFileNameToId(entry.name) === target
  );

  if (!backupFile) {
    throw new Error("Could not find backup target binary");
  }

  return Buffer.from(await backupFile.arrayBuffer());
};

type LocalBackup = { id: string; name?: string; data: Buffer };
const maxNumBackups = 4;
const uploadedBackup: LocalBackup[] = [];

export const registerBackup = (backupBuffer: Buffer, name?: string): string => {
  const hash = md5(backupBuffer);
  uploadedBackup.push({ id: hash, name, data: backupBuffer });

  if (uploadedBackup.length > maxNumBackups) {
    uploadedBackup.shift();
  }
  return hash;
};

export const getLocalBackupById = (id: string): LocalBackup | undefined =>
  uploadedBackup.find((backup) => backup.id === id);

export const fetchPrBuild = async (
  github: GithubClient,
  commitSha: string
): Promise<{ id: string; url: string } | undefined> => {
  const checks = (
    await github("GET /repos/{owner}/{repo}/commits/{ref}/check-runs", {
      repo: config.github.repos.firmware,
      owner: config.github.organization,
      ref: commitSha,
    })
  ).data;

  const githubActionsRun = checks.check_runs.find(
    (run) =>
      run.app?.slug === "github-actions" &&
      run.name.toLowerCase().includes("build")
  );

  if (!githubActionsRun) {
    return undefined;
  }

  const job = await github("GET /repos/{owner}/{repo}/actions/jobs/{job_id}", {
    repo: config.github.repos.firmware,
    owner: config.github.organization,
    job_id: githubActionsRun.id,
  });

  const { artifacts } = (
    await github("GET /repos/{owner}/{repo}/actions/runs/{run_id}/artifacts", {
      repo: config.github.repos.firmware,
      owner: config.github.organization,
      run_id: job.data.run_id,
    })
  ).data;

  const backupAsset = artifacts.find((artifact) =>
    artifact.name.includes("backup")
  );

  if (!backupAsset) {
    return undefined;
  }

  return {
    id: backupAsset.id.toString(),
    url: backupAsset.archive_download_url,
  };
};
