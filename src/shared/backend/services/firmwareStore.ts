import md5 from "md5";
import { ZipInfoRaw, unzipRaw } from "unzipit";
import ZipHTTPRangeReader from "shared/backend/utils/ZipHTTPRangeReader";
import ky from "ky";
import config from "shared/backend/config";
import environment from "shared/environment";
import { uniqueBy } from "shared/tools";
import { GithubClient } from "shared/api/github";

export type Target = {
  name: string;
  code: string;
};

type FirmwareFile = {
  targets: [string, string][];
};

const firmwareBundleBlobs: Record<string, Promise<Blob>> = {};

const firmwareTargetsCache: Record<string, Promise<Target[]>> = {};

const firmwarePattern = /(\.bin|\.uf2)$/i;

const firmwareBundle = async (url: string): Promise<ZipInfoRaw> => {
  // For github action related assets we can't use Range reads :(
  const reader = url.includes("api.github.com")
    ? await (async () => {
        if (!firmwareBundleBlobs[url]) {
          firmwareBundleBlobs[url] = ky(url, {
            prefixUrl: !environment.isMain ? config.proxyUrl : undefined,
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
        return firmwareBundleBlobs[url]!;
      })()
    : new ZipHTTPRangeReader(url);

  return unzipRaw(reader);
};

export const firmwareTargets = async (
  firmwareBundleUrl: string
): Promise<Target[]> => {
  if (!firmwareTargetsCache[firmwareBundleUrl]) {
    firmwareTargetsCache[firmwareBundleUrl] = (async () => {
      try {
        const { entries } = await firmwareBundle(firmwareBundleUrl);
        const firmwareFile = entries.find((entry) =>
          entry.name.endsWith("fw.json")
        );

        if (!firmwareFile) {
          delete firmwareTargetsCache[firmwareBundleUrl];
          throw new Error("Could not find firmware metadata file");
        }

        const data = (await firmwareFile.json()) as FirmwareFile;

        return uniqueBy(
          data.targets.map(([name, code]) => ({
            name,
            code: code.slice(0, code.length - 1),
          })),
          "code"
        );
      } catch (e) {
        delete firmwareTargetsCache[firmwareBundleUrl];
        throw e;
      }
    })();
  }

  // We have to have just assigned this
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return firmwareTargetsCache[firmwareBundleUrl]!;
};

const firmwareFileNameToId = (fileName: string): string => {
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const withoutExtension = fileName
    .split("/")
    .pop()!
    .replace(firmwarePattern, "");
  const withoutCommitHash = withoutExtension.split("-").slice(0, -1).join("-");

  return withoutCommitHash;
};

export const fetchFirmware = async (
  firmwareBundleUrl: string,
  target: string
): Promise<Buffer> => {
  const { entries } = await firmwareBundle(firmwareBundleUrl);
  const firmwareFile = entries.find(
    (entry) =>
      entry.name.match(firmwarePattern) &&
      firmwareFileNameToId(entry.name) === target
  );

  if (!firmwareFile) {
    throw new Error("Could not find firmware target binary");
  }

  return Buffer.from(await firmwareFile.arrayBuffer());
};

type LocalFirmware = { id: string; name?: string; data: Buffer };
const maxNumFirmwares = 4;
const uploadedFirmware: LocalFirmware[] = [];

export const registerFirmware = (
  firmwareBuffer: Buffer,
  name?: string
): string => {
  const hash = md5(firmwareBuffer);
  uploadedFirmware.push({ id: hash, name, data: firmwareBuffer });

  if (uploadedFirmware.length > maxNumFirmwares) {
    uploadedFirmware.shift();
  }
  return hash;
};

export const getLocalFirmwareById = (id: string): LocalFirmware | undefined =>
  uploadedFirmware.find((firmware) => firmware.id === id);

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

  const firmwareAsset = artifacts.find((artifact) =>
    artifact.name.includes("firmware")
  );

  if (!firmwareAsset) {
    return undefined;
  }

  return {
    id: firmwareAsset.id.toString(),
    url: firmwareAsset.archive_download_url,
  };
};
