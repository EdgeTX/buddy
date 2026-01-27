/* eslint-disable no-await-in-loop, no-restricted-syntax, no-continue, no-plusplus, no-useless-catch, no-empty */
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

/**
 * Restore backup models to a directory
 */
export const restoreBackupToDirectory = async (
  backup: LocalBackup,
  directoryHandle: FileSystemDirectoryHandle,
  options?: {
    selectedModels?: string[];
    overwriteExisting?: boolean;
    modelRenames?: Record<string, string>; // oldName -> newName
  }
): Promise<{ success: boolean; filesWritten: number; errors: string[] }> => {
  const errors: string[] = [];
  let filesWritten = 0;

  try {
    const { entries } = await unzipRaw(new Blob([backup.data]));

    // Filter for MODELS directory entries
    const modelEntries = entries.filter(
      (entry) => entry.name.startsWith("MODELS/") && entry.name.endsWith(".yml")
    );

    // Filter by selected models if specified
    const entriesToRestore = options?.selectedModels
      ? modelEntries.filter((entry) => {
          const modelName = entry.name.split("/").pop()?.replace(".yml", "");
          return options.selectedModels?.includes(modelName ?? "");
        })
      : modelEntries;

    // Get or create MODELS directory
    const modelsDirectory = await directoryHandle.getDirectoryHandle("MODELS", {
      create: true,
    });

    // Read existing labels.yml if it exists
    const yaml = await import("yaml");
    let labelsData: Record<string, unknown> = {
      Labels: {},
      Models: {},
      Sort: 1,
    };

    try {
      const labelsHandle = await modelsDirectory.getFileHandle("labels.yml");
      const labelsFile = await labelsHandle.getFile();
      const labelsContent = await labelsFile.text();
      labelsData = yaml.parse(labelsContent) as Record<string, unknown>;
    } catch {
      // Labels file doesn't exist, will create new one
    }

    // Ensure Models section exists
    if (!labelsData.Models || typeof labelsData.Models !== "object") {
      labelsData.Models = {};
    }

    // Track which models were successfully restored for labels update
    const restoredModels: { fileName: string; content: string }[] = [];

    // Write each model file
    for (const entry of entriesToRestore) {
      try {
        const originalFileName = entry.name.split("/").pop();
        if (!originalFileName) {
          continue;
        }

        const originalModelName = originalFileName.replace(".yml", "");

        // Check if this model should be renamed
        const targetModelName =
          options?.modelRenames?.[originalModelName] ?? originalModelName;
        const fileName = `${targetModelName}.yml`;

        // Check if file exists
        if (!options?.overwriteExisting) {
          try {
            await modelsDirectory.getFileHandle(fileName);
            errors.push(`File ${fileName} already exists, skipping`);
            continue;
          } catch {
            // File doesn't exist, continue with writing
          }
        }

        const fileHandle = await modelsDirectory.getFileHandle(fileName, {
          create: true,
        });
        const writable = await fileHandle.createWritable();
        const content = await entry.arrayBuffer();
        await writable.write(content);
        await writable.close();

        // Store for labels update
        const contentText = new TextDecoder().decode(content);
        restoredModels.push({ fileName, content: contentText });

        filesWritten++;
      } catch (error) {
        const fileName = entry.name.split("/").pop() ?? "unknown";
        errors.push(
          `Error writing ${fileName}: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    // Update labels.yml with restored models
    if (restoredModels.length > 0) {
      try {
        const modelsSection = labelsData.Models as Record<string, unknown>;

        for (const { fileName, content } of restoredModels) {
          try {
            const modelData = yaml.parse(content) as Record<string, unknown>;
            const modelName =
              modelData.header && typeof modelData.header === "object"
                ? ((modelData.header as Record<string, unknown>).name as string)
                : fileName.replace(".yml", "");

            // Add or update model entry in labels
            modelsSection[fileName] = {
              hash: "", // Hash will be generated by radio
              name: modelName,
              labels: "",
              bitmap: "",
              lastopen: 946684800, // Default timestamp
            };
          } catch (error) {}
        }

        // Write updated labels.yml
        const labelsYaml = yaml.stringify(labelsData);
        const labelsHandle = await modelsDirectory.getFileHandle("labels.yml", {
          create: true,
        });
        const labelsWritable = await labelsHandle.createWritable();
        await labelsWritable.write(labelsYaml);
        await labelsWritable.close();
      } catch (error) {
        errors.push(
          `Failed to update labels.yml: ${
            error instanceof Error ? error.message : String(error)
          }`
        );
      }
    }

    return {
      success: errors.length === 0 || filesWritten > 0,
      filesWritten,
      errors,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Check for collisions between backup models and existing SD card models
 */
export const checkModelCollisions = async (
  backup: LocalBackup,
  directoryHandle: FileSystemDirectoryHandle,
  selectedModels?: string[]
): Promise<
  {
    fileName: string;
    existingContent: string;
    backupContent: string;
    displayName: string;
  }[]
> => {
  const collisions: {
    fileName: string;
    existingContent: string;
    backupContent: string;
    displayName: string;
  }[] = [];

  try {
    const { entries } = await unzipRaw(new Blob([backup.data]));
    const yaml = await import("yaml");

    // Filter for MODELS directory entries
    const modelEntries = entries.filter(
      (entry) => entry.name.startsWith("MODELS/") && entry.name.endsWith(".yml")
    );

    // Filter by selected models if specified
    const entriesToCheck = selectedModels
      ? modelEntries.filter((entry) => {
          const modelName = entry.name.split("/").pop()?.replace(".yml", "");
          return selectedModels.includes(modelName ?? "");
        })
      : modelEntries;

    // Get MODELS directory from SD card
    const modelsDirectory = await directoryHandle.getDirectoryHandle("MODELS");

    for (const entry of entriesToCheck) {
      const fileName = entry.name.split("/").pop();
      if (!fileName) continue;

      const modelName = fileName.replace(".yml", "");

      // Check if file exists on SD card
      try {
        const existingFileHandle = await modelsDirectory.getFileHandle(
          fileName
        );
        const existingFile = await existingFileHandle.getFile();
        const existingContent = await existingFile.text();

        // Get backup content
        const backupBlob = await entry.blob();
        const backupContent = await backupBlob.text();

        // Extract display name from backup
        let displayName = modelName;
        try {
          const parsed = yaml.parse(backupContent) as {
            header?: { name?: string };
          };
          displayName = parsed.header?.name ?? modelName;
        } catch {
          // Use file name if parsing fails
        }

        collisions.push({
          fileName: modelName,
          existingContent,
          backupContent,
          displayName,
        });
      } catch {
        // File doesn't exist, no collision
      }
    }

    return collisions;
  } catch (error) {
    throw error;
  }
};

/**
 * Find available model slots (model01-model64)
 */
export const findAvailableModelSlots = async (
  directoryHandle: FileSystemDirectoryHandle,
  count: number
): Promise<string[]> => {
  const availableSlots: string[] = [];

  try {
    const modelsDirectory = await directoryHandle.getDirectoryHandle("MODELS");

    // Check slots from model01 to model64
    for (let i = 1; i <= 64 && availableSlots.length < count; i++) {
      const slotName = `model${i.toString().padStart(2, "0")}`;
      const fileName = `${slotName}.yml`;

      try {
        await modelsDirectory.getFileHandle(fileName);
        // File exists, slot is taken
      } catch {
        // File doesn't exist, slot is available
        availableSlots.push(slotName);
      }
    }

    return availableSlots;
  } catch (error) {
    throw error;
  }
};

/**
 * Get models from SD card with their display names
 */
export const getModelsWithNames = async (
  directoryHandle: FileSystemDirectoryHandle
): Promise<{ fileName: string; displayName: string }[]> => {
  try {
    const modelsDirectory = await directoryHandle.getDirectoryHandle("MODELS");
    const models: { fileName: string; displayName: string }[] = [];

    // Dynamic import of yaml
    const yaml = await import("yaml");

    // Iterate through MODELS directory
    for await (const entry of modelsDirectory.values()) {
      if (entry.kind === "file" && entry.name.endsWith(".yml")) {
        const modelFileName = entry.name.replace(".yml", "");

        // Skip labels file
        if (modelFileName === "labels") {
          continue;
        }

        const fileHandle = entry;
        const file = await fileHandle.getFile();
        const content = await file.text();

        try {
          const parsed = yaml.parse(content) as { header?: { name?: string } };
          const displayName = parsed.header?.name ?? modelFileName;

          models.push({
            fileName: modelFileName,
            displayName,
          });
        } catch (error) {
          // If parsing fails, use file name as display name
          models.push({
            fileName: modelFileName,
            displayName: modelFileName,
          });
        }
      }
    }

    return models;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Failed to read models: ${error.message}`
        : "Failed to read models from SD card"
    );
  }
};

/**
 * Create backup from SD card directory
 */
export const createBackupFromDirectory = async (
  directoryHandle: FileSystemDirectoryHandle,
  options?: {
    selectedModels?: string[];
    includeLabels?: boolean;
  }
): Promise<Buffer> => {
  try {
    // Get MODELS directory
    const modelsDirectory = await directoryHandle.getDirectoryHandle("MODELS");

    // Dynamic imports
    const fflate = await import("fflate");
    const yaml = await import("yaml");

    // Collect all files to zip
    const files: Record<string, Uint8Array> = {};
    let labelsData: Record<string, unknown> | null = null;

    // First, read the labels file if it exists
    try {
      const labelsHandle = await modelsDirectory.getFileHandle("labels.yml");
      const labelsFile = await labelsHandle.getFile();
      const labelsContent = await labelsFile.text();
      labelsData = yaml.parse(labelsContent) as Record<string, unknown>;
    } catch {}

    // Iterate through MODELS directory
    for await (const entry of modelsDirectory.values()) {
      if (entry.kind === "file" && entry.name.endsWith(".yml")) {
        const modelName = entry.name.replace(".yml", "");

        // Skip labels file in first pass
        if (modelName === "labels") {
          continue;
        }

        // Filter by selected models if specified
        if (
          options?.selectedModels &&
          !options.selectedModels.includes(modelName)
        ) {
          continue;
        }

        const fileHandle = entry;
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);

        files[`MODELS/${entry.name}`] = uint8Array;
      }
    }

    // Add labels file if requested
    if (labelsData && options?.includeLabels) {
      if (options.selectedModels) {
        // Filter labels data to only include selected models
        const filteredLabels: Record<string, unknown> = {};

        for (const modelName of options.selectedModels) {
          if (labelsData[modelName]) {
            filteredLabels[modelName] = labelsData[modelName];
          }
        }

        // Convert filtered labels to YAML and add to files
        const labelsYaml = yaml.stringify(filteredLabels);
        const labelsBuffer = new TextEncoder().encode(labelsYaml);
        files["MODELS/labels.yml"] = labelsBuffer;
      } else {
        // Include all labels if no selection
        const labelsYaml = yaml.stringify(labelsData);
        const labelsBuffer = new TextEncoder().encode(labelsYaml);
        files["MODELS/labels.yml"] = labelsBuffer;
      }
    }

    if (
      Object.keys(files).filter((f) => !f.endsWith("labels.yml")).length === 0
    ) {
      throw new Error("No models found to backup");
    }

    // Create ZIP file
    const zipped = fflate.zipSync(files, {
      level: 6,
      mtime: new Date(),
    });

    return Buffer.from(zipped);
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Failed to create backup: ${error.message}`
        : "Failed to create backup from SD card"
    );
  }
};

/**
 * Download individual model files
 */
export const downloadIndividualModels = async (
  directoryHandle: FileSystemDirectoryHandle,
  options: {
    selectedModels: string[];
    includeLabels?: boolean;
  }
): Promise<{ fileName: string; base64Data: string }[]> => {
  try {
    // Get MODELS directory
    const modelsDirectory = await directoryHandle.getDirectoryHandle("MODELS");

    // Dynamic imports
    const yaml = await import("yaml");

    const files: { fileName: string; base64Data: string }[] = [];

    // Download selected model files
    for (const modelName of options.selectedModels) {
      try {
        const fileHandle = await modelsDirectory.getFileHandle(
          `${modelName}.yml`
        );
        const file = await fileHandle.getFile();
        const arrayBuffer = await file.arrayBuffer();
        const base64Data = Buffer.from(arrayBuffer).toString("base64");

        files.push({
          fileName: `${modelName}.yml`,
          base64Data,
        });
      } catch (error) {
        // Continue with other models even if one fails
      }
    }

    // Download labels file if requested
    if (options.includeLabels) {
      try {
        const labelsHandle = await modelsDirectory.getFileHandle("labels.yml");
        const labelsFile = await labelsHandle.getFile();
        const labelsContent = await labelsFile.text();
        const labelsData = yaml.parse(labelsContent) as Record<string, unknown>;

        // Filter labels to only include selected models
        const filteredLabels: Record<string, unknown> = {};
        for (const modelName of options.selectedModels) {
          if (labelsData[modelName]) {
            filteredLabels[modelName] = labelsData[modelName];
          }
        }

        const labelsYaml = yaml.stringify(filteredLabels);
        const base64Data = Buffer.from(labelsYaml).toString("base64");

        files.push({
          fileName: "labels.yml",
          base64Data,
        });
      } catch (error) {
        // Continue even if labels file is not found
      }
    }

    if (files.length === 0) {
      throw new Error("No models found to download");
    }

    return files;
  } catch (error) {
    throw new Error(
      error instanceof Error
        ? `Failed to download models: ${error.message}`
        : "Failed to download individual models"
    );
  }
};

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
