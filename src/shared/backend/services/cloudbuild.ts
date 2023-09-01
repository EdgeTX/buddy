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

type JobStatusParams = {
  release: string;
  target: string;
  flags: { name: string; value: string }[];
};

export type JobStatus =
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
  const response = await ky("https://cloudbuild.edgetx.org/api/targets");
  const firmwares = (await response.json()) as CloudTargets;
  return firmwares;
};

export const queryJobStatus = async (params: JobStatusParams): Promise<Job> => {
  const response = await ky.post("https://cloudbuild.edgetx.org/api/status", {
    body: JSON.stringify(params),
    throwHttpErrors: false,
  });

  const data = (await response.json()) as { error?: string } & Job;
  if (!response.ok) {
    throw new Error(data.error);
  }

  return data as Job;
};

export const createJob = async (params: JobStatusParams): Promise<Job> => {
  const response = await ky.post("https://cloudbuild.edgetx.org/api/jobs", {
    body: JSON.stringify(params),
    throwHttpErrors: false,
  });

  const data = (await response.json()) as { error?: string } & Job;
  if (!response.ok) {
    throw new Error(data.error);
  }

  return data as Job;
};

export const downloadBinary = async (downloadUrl: string): Promise<Buffer> => {
  const response = await ky(downloadUrl, {
    prefixUrl: PRODUCTION ? undefined : config.proxyUrl,
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
