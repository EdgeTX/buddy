import ky from "ky";
import config from "shared/backend/config";

const PRODUCTION = process.env.NODE_ENV === "production";

type Release = {
  sha: string;
  exclude_targets?: string[];
};

type Tag = {
  flags: Record<string, TargetFlag>;
};

type TargetFlag = {
  values: string[];
};

type Target = {
  description: string;
  tags?: string[];
};

type CloudTargets = {
  releases: Record<string, Release>;
  flags: Record<string, TargetFlag>;
  tags: Record<string, Tag>;
  targets: Record<string, Target>;
};

export type Flags = {
  id: string;
  values: string[];
}[];

export type SelectedFlags = {
  name?: string;
  value?: string;
}[];

type JobStatusParams = {
  target: string;
  release: string;
  flags: { name: string; value: string }[];
};

type JobStatus =
  | "VOID"
  | "WAITING_FOR_BUILD"
  | "BUILD_IN_PROGRESS"
  | "BUILD_SUCCESS"
  | "BUILD_ERROR";

type Artifact = {
  created_at: string;
  updated_at: string;
  download_url: string;
};

type Job = {
  status: JobStatus;
  build_attempts: number;
  artifacts: [Artifact];
  build_started_at: string;
  build_ended_at: string;
  created_at: string;
  updated_at: string;
};

export const fetchTargets = async (): Promise<CloudTargets> => {
  const response = await ky("https://cloudbuild.edgetx.org/api/targets", {
    prefixUrl: PRODUCTION ? undefined : config.proxyUrl,
  });
  const firmwares = (await response.json()) as CloudTargets;
  return firmwares;
};

export const queryJobStatus = async (params: JobStatusParams): Promise<Job> => {
  const response = await ky("https://cloudbuild.edgetx.org/api/status", {
    body: JSON.stringify(params),
    prefixUrl: PRODUCTION ? undefined : config.proxyUrl,
  });
  return {} as any;
};
