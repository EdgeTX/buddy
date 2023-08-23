import ky from "ky";
import config from "shared/backend/config";

type Release = {
  sha: string;
  exclude_targets?: string[];
}

type Tag = {
  flags: Record<string, string[]>;
}

type TargetFlag = {
  values: string[];
}

type Target = {
  description: string;
  tags: string[];
}

type CloudTargets = {
  releases: Record<string, Release>;
  flags: Record<string, TargetFlag>;
  tags: Record<string, Tag>;
  targets: Record<string, Target>;
}

export const fetchTargets = async (): Promise<CloudTargets> => {
  const response = await ky("https://cloudbuild.edgetx.org/api/targets", {
    prefixUrl: config.proxyUrl,
  });
  const firmwares = await response.json() as CloudTargets;
  return firmwares;
};
