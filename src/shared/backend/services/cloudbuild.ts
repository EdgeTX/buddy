import ky from "ky";
import { JobStatus } from "shared/backend/types";

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

function timeout(ms: number): Promise<void> {
  /* eslint-disable-next-line no-promise-executor-return */
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const waitForJobSuccess = async (
  params: JobStatusParams,
  updateStatus: (statusData: {
    jobStatus: JobStatus;
    startedAt: string;
  }) => void,
  timeoutMs = 960000 // 16mn
): Promise<Job | undefined> => {
  const iterTime = 5000;
  const iterNb = Math.ceil(timeoutMs / iterTime);

  // job status data
  let startedAt = new Date().getTime().toString();
  let lastStatus: JobStatus | undefined;

  /* eslint-disable no-await-in-loop */
  for (let i = 0; i < iterNb; i += 1) {
    const jobStatus = await queryJobStatus(params);

    // notify client of current status
    if (lastStatus !== jobStatus.status) {
      startedAt = new Date().getTime().toString();
      lastStatus = jobStatus.status;
    }
    updateStatus({ jobStatus: jobStatus.status, startedAt });

    if (jobStatus.status === "BUILD_SUCCESS") {
      return jobStatus;
    }
    await timeout(iterTime);
  }
  /* eslint-enable no-await-in-loop */
  throw new Error("Build process timeout");
};

export const downloadBinary = async (downloadUrl: string): Promise<Buffer> => {
  const response = await ky(downloadUrl, {
    headers: {
      origin: "null",
    },
  });
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
};
