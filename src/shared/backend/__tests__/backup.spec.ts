/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-explicit-any */
import gql from "graphql-tag";
import { MockedFunction } from "vitest";
import { createExecutor } from "test-utils/backend";
import getOriginPrivateDirectory from "native-file-system-adapter/src/getOriginPrivateDirectory";
import nodeAdapter from "native-file-system-adapter/src/adapters/node";
import tmp from "tmp-promise";
import fs from "fs/promises";
import path from "path";
import { execSync } from "child_process";
import { MAX_MODELS_BW, MAX_MODELS_COLOR } from "shared/firmware-constants";

const requestWritableDirectory = vitest.fn() as MockedFunction<
  typeof window.showDirectoryPicker
>;

const backend = createExecutor({
  fileSystem: {
    requestWritableDirectory,
  },
});

/**
 * Helper to create a sample model YAML content
 */
const createModelYaml = (name: string) =>
  `header:
  name: ${name}
  labels: ""
  bitmap: ""
  modelId: 1
timers:
  - mode: 0
    start: 0
    value: 0
    countdownBeep: 0
    name: ""
`;

/**
 * Helper to create a backup ZIP buffer with model files
 * Uses a subprocess to avoid jsdom's broken fflate behavior
 */
const createBackupZip = (
  models: { name: string; content: string }[],
  extraFiles?: Record<string, string>
) => {
  // Create the ZIP in a separate Node process to avoid jsdom issues
  const modelsJson = JSON.stringify(models);
  const extraJson = JSON.stringify(extraFiles ?? {});
  const script = `
    const fflate = require('fflate');
    const models = JSON.parse(process.argv[1]);
    const extra = JSON.parse(process.argv[2]);
    const files = {};
    for (const model of models) {
      files['MODELS/' + model.name + '.yml'] = new TextEncoder().encode(model.content);
    }
    for (const [path, content] of Object.entries(extra)) {
      files[path] = new TextEncoder().encode(content);
    }
    const zipped = fflate.zipSync(files, { level: 6 });
    process.stdout.write(Buffer.from(zipped).toString('base64'));
  `;

  const result = execSync(
    `node -e "${script
      .replace(/"/g, '\\"')
      .replace(/\n/g, " ")}" '${modelsJson}' '${extraJson}'`,
    {
      encoding: "utf-8",
    }
  );

  return Buffer.from(result, "base64");
};

/**
 * Helper to set up a SD card directory with MODELS folder
 */
const setupSdcardDirectory = async (tempPath: string) => {
  const modelsPath = path.join(tempPath, "MODELS");
  await fs.mkdir(modelsPath, { recursive: true });
  return modelsPath;
};

describe("Backup", () => {
  describe("Query", () => {
    describe("localBackup", () => {
      it("should return null when backup does not exist", async () => {
        const { data, errors } = await backend.query({
          query: gql`
            query {
              localBackup(byId: "nonexistent-id") {
                id
                name
                base64Data
              }
            }
          `,
        });

        expect(errors).toBeFalsy();
        expect(data?.localBackup).toBeNull();
      });

      it("should return registered backup by id", async () => {
        // First register a backup
        const modelContent = createModelYaml("TestModel");
        const zipBuffer = createBackupZip([
          { name: "model1", content: modelContent },
        ]);
        const base64Data = zipBuffer.toString("base64");

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!, $name: String) {
              registerLocalBackup(backupBase64Data: $data, fileName: $name) {
                id
                name
              }
            }
          `,
          variables: {
            data: base64Data,
            name: "test-backup.etx",
          },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Now query it
        const { data, errors } = await backend.query({
          query: gql`
            query GetBackup($id: ID!) {
              localBackup(byId: $id) {
                id
                name
                base64Data
              }
            }
          `,
          variables: { id: backupId },
        });

        expect(errors).toBeFalsy();
        expect(data?.localBackup).toEqual({
          id: backupId,
          name: "test-backup.etx",
          base64Data,
        });
      });
    });

    describe("sdcardModelsWithNames", () => {
      let tempDir: tmp.DirectoryResult;

      beforeEach(async () => {
        tempDir = await tmp.dir({ unsafeCleanup: true });
      });

      afterEach(async () => {
        await tempDir.cleanup().catch(() => {});
      });

      it("should return list of models with display names from SD card", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create model files
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("My Quad")
        );
        await fs.writeFile(
          path.join(modelsPath, "model2.yml"),
          createModelYaml("Trainer Plane")
        );

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Query models
        const { data, errors } = await backend.query({
          query: gql`
            query GetModels($directoryId: ID!) {
              sdcardModelsWithNames(directoryId: $directoryId) {
                fileName
                displayName
              }
            }
          `,
          variables: { directoryId },
        });

        expect(errors).toBeFalsy();
        expect(data?.sdcardModelsWithNames).toEqual(
          expect.arrayContaining([
            { fileName: "model1", displayName: "My Quad" },
            { fileName: "model2", displayName: "Trainer Plane" },
          ])
        );
      });

      it("should return empty list when MODELS directory is empty", async () => {
        await setupSdcardDirectory(tempDir.path);

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { data, errors } = await backend.query({
          query: gql`
            query GetModels($directoryId: ID!) {
              sdcardModelsWithNames(directoryId: $directoryId) {
                fileName
                displayName
              }
            }
          `,
          variables: { directoryId },
        });

        expect(errors).toBeFalsy();
        expect(data?.sdcardModelsWithNames).toEqual([]);
      });
    });

    describe("checkModelCollisions", () => {
      let tempDir: tmp.DirectoryResult;

      beforeEach(async () => {
        tempDir = await tmp.dir({ unsafeCleanup: true });
      });

      afterEach(async () => {
        await tempDir.cleanup().catch(() => {});
      });

      it("should detect collisions between backup and SD card models", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create existing model on SD card
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("Existing Model")
        );

        // Register backup with same model name
        const backupZip = createBackupZip([
          { name: "model1", content: createModelYaml("Backup Model") },
        ]);
        const base64Data = backupZip.toString("base64");

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: base64Data },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Check collisions
        const { data, errors } = await backend.query({
          query: gql`
            query CheckCollisions($backupId: ID!, $directoryId: ID!) {
              checkModelCollisions(
                backupId: $backupId
                directoryId: $directoryId
              ) {
                fileName
                displayName
                existingContent
                backupContent
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.checkModelCollisions).toHaveLength(1);
        expect((data as any)?.checkModelCollisions[0]).toMatchObject({
          fileName: "model1",
          displayName: "Backup Model",
        });
        expect(
          (data as any)?.checkModelCollisions[0].existingContent
        ).toContain("Existing Model");
        expect((data as any)?.checkModelCollisions[0].backupContent).toContain(
          "Backup Model"
        );
      });

      it("should return empty array when no collisions exist", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create existing model on "SD card"
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("Existing Model")
        );

        // Register backup with different model name
        const backupZip = createBackupZip([
          { name: "model2", content: createModelYaml("Backup Model") },
        ]);
        const base64Data = backupZip.toString("base64");

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: base64Data },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Check collisions
        const { data, errors } = await backend.query({
          query: gql`
            query CheckCollisions($backupId: ID!, $directoryId: ID!) {
              checkModelCollisions(
                backupId: $backupId
                directoryId: $directoryId
              ) {
                fileName
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();
        expect(data?.checkModelCollisions).toEqual([]);
      });
    });

    describe("availableModelSlots", () => {
      let tempDir: tmp.DirectoryResult;

      beforeEach(async () => {
        tempDir = await tmp.dir({ unsafeCleanup: true });
      });

      afterEach(async () => {
        await tempDir.cleanup().catch(() => {});
      });

      it("should return available model slots (colorlcd with labels.yml)", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create some existing models and labels.yml to indicate colorlcd
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("Model 1")
        );
        await fs.writeFile(
          path.join(modelsPath, "model2.yml"),
          createModelYaml("Model 2")
        );
        await fs.writeFile(
          path.join(modelsPath, "labels.yml"),
          "Models: {}\nLabels: {}\nSort: 1\n"
        );

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Query available slots
        const { data, errors } = await backend.query({
          query: gql`
            query GetSlots($directoryId: ID!, $count: Int!) {
              availableModelSlots(directoryId: $directoryId, count: $count)
            }
          `,
          variables: { directoryId, count: 3 },
        });

        expect(errors).toBeFalsy();
        expect(data?.availableModelSlots).toEqual([
          "model3",
          "model4",
          "model5",
        ]);
      });

      it("should error when MODELS directory does not exist", async () => {
        // Don't create MODELS directory - use empty tempDir

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Query available slots - should fail because MODELS doesn't exist
        const { errors } = await backend.query({
          query: gql`
            query GetSlots($directoryId: ID!, $count: Int!) {
              availableModelSlots(directoryId: $directoryId, count: $count)
            }
          `,
          variables: { directoryId, count: 3 },
        });

        expect(errors).toBeTruthy();
      });

      it("should return B&W model slots (no labels.yml)", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create B&W-style models (no labels.yml)
        await fs.writeFile(
          path.join(modelsPath, "model00.yml"),
          createModelYaml("Model 0")
        );
        await fs.writeFile(
          path.join(modelsPath, "model01.yml"),
          createModelYaml("Model 1")
        );

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { data, errors } = await backend.query({
          query: gql`
            query GetSlots($directoryId: ID!, $count: Int!) {
              availableModelSlots(directoryId: $directoryId, count: $count)
            }
          `,
          variables: { directoryId, count: 3 },
        });

        expect(errors).toBeFalsy();
        // B&W: model00 and model01 are taken, so model02, model03, model04 should be available
        expect(data?.availableModelSlots).toEqual([
          "model02",
          "model03",
          "model04",
        ]);
      });
    });
  });

  describe("Mutation", () => {
    let tempDir: tmp.DirectoryResult;

    beforeEach(async () => {
      tempDir = await tmp.dir({ unsafeCleanup: true });
    });

    afterEach(async () => {
      await tempDir.cleanup().catch(() => {});
    });

    describe("registerLocalBackup", () => {
      it("should register a backup and return its id", async () => {
        const modelContent = createModelYaml("TestModel");
        const zipBuffer = createBackupZip([
          { name: "model1", content: modelContent },
        ]);
        const base64Data = zipBuffer.toString("base64");

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!, $name: String) {
              registerLocalBackup(backupBase64Data: $data, fileName: $name) {
                id
                name
                base64Data
              }
            }
          `,
          variables: {
            data: base64Data,
            name: "my-backup.etx",
          },
        });

        expect(errors).toBeFalsy();
        expect(data?.registerLocalBackup).toEqual({
          id: expect.any(String),
          name: "my-backup.etx",
          base64Data,
        });
      });

      it("should use id as name when fileName not provided", async () => {
        const zipBuffer = createBackupZip([
          { name: "model1", content: createModelYaml("TestModel") },
        ]);
        const base64Data = zipBuffer.toString("base64");

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
                name
              }
            }
          `,
          variables: { data: base64Data },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.registerLocalBackup.id).toEqual(
          (data as any)?.registerLocalBackup.name
        );
      });

      it("should keep only last 4 backups (LRU cache)", async () => {
        const backupIds: string[] = [];

        // Register 5 backups
        for (let i = 0; i < 5; i += 1) {
          const zipBuffer = createBackupZip([
            { name: `mode0l0${i}`, content: createModelYaml(`Model ${i}`) },
          ]);

          const result = await backend.mutate({
            mutation: gql`
              mutation RegisterBackup($data: String!) {
                registerLocalBackup(backupBase64Data: $data) {
                  id
                }
              }
            `,
            variables: { data: zipBuffer.toString("base64") },
          });

          backupIds.push(
            ((result.data?.registerLocalBackup as any)?.id as string) || ""
          );
        }

        // First backup should be evicted
        const { data: firstBackup } = await backend.query({
          query: gql`
            query GetBackup($id: ID!) {
              localBackup(byId: $id) {
                id
              }
            }
          `,
          variables: { id: backupIds[0] },
        });

        expect(firstBackup?.localBackup).toBeNull();

        // Last backup should still exist
        const { data: lastBackup } = await backend.query({
          query: gql`
            query GetBackup($id: ID!) {
              localBackup(byId: $id) {
                id
              }
            }
          `,
          variables: { id: backupIds[4] },
        });

        expect(lastBackup?.localBackup).not.toBeNull();
      });
    });

    describe("restoreBackupToSdcard", () => {
      it("should restore models from backup to SD card", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Register backup
        const backupZip = createBackupZip([
          { name: "model1", content: createModelYaml("Restored Model 1") },
          { name: "model2", content: createModelYaml("Restored Model 2") },
        ]);

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Restore backup
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
                overwriteExisting: true
              ) {
                id
                status
                filesWritten
                error
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();
        expect(data?.restoreBackupToSdcard).toMatchObject({
          status: "completed",
          filesWritten: 2,
        });

        // Verify files were created
        const model1Content = await fs.readFile(
          path.join(modelsPath, "model1.yml"),
          "utf-8"
        );
        expect(model1Content).toContain("Restored Model 1");

        const model2Content = await fs.readFile(
          path.join(modelsPath, "model2.yml"),
          "utf-8"
        );
        expect(model2Content).toContain("Restored Model 2");
      });

      it("should restore only selected models", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Register backup with multiple models
        const backupZip = createBackupZip([
          { name: "model1", content: createModelYaml("Model 1") },
          { name: "model2", content: createModelYaml("Model 2") },
          { name: "model3", content: createModelYaml("Model 3") },
        ]);

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Restore only model 1 and model 2
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup(
              $backupId: ID!
              $directoryId: ID!
              $selectedModels: [String!]
            ) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
                selectedModels: $selectedModels
                overwriteExisting: true
              ) {
                filesWritten
              }
            }
          `,
          variables: {
            backupId,
            directoryId,
            selectedModels: ["model1", "model2"],
          },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.restoreBackupToSdcard.filesWritten).toBe(2);

        // Verify only selected files exist
        const files = await fs.readdir(modelsPath);
        expect(files).toContain("model1.yml");
        expect(files).toContain("model2.yml");
        expect(files).not.toContain("model3.yml");
      });

      it("should rename models when modelRenames is provided", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Register backup
        const backupZip = createBackupZip([
          { name: "model1", content: createModelYaml("Original Model") },
        ]);

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Restore with rename
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup(
              $backupId: ID!
              $directoryId: ID!
              $modelRenames: String
            ) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
                modelRenames: $modelRenames
                overwriteExisting: true
              ) {
                filesWritten
              }
            }
          `,
          variables: {
            backupId,
            directoryId,
            modelRenames: JSON.stringify({
              model1: `model${MAX_MODELS_BW - 1}`,
            }),
          },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.restoreBackupToSdcard.filesWritten).toBe(1);

        // Verify renamed file exists
        const files = await fs.readdir(modelsPath);
        expect(files).toContain(`model${MAX_MODELS_BW - 1}.yml`);
        expect(files).not.toContain("model1.yml");
      });

      it("should return failed status when backup data is corrupted", async () => {
        await setupSdcardDirectory(tempDir.path);

        // Register a backup with corrupted (non-ZIP) data
        const corruptedData = Buffer.from("this is not a valid zip file");

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: corruptedData.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Try to restore corrupted backup - should return failed status
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
              ) {
                status
                error
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        // Should not throw GraphQL error, but return a failed status
        expect(errors).toBeFalsy();
        expect((data as any)?.restoreBackupToSdcard.status).toBe("failed");
        expect((data as any)?.restoreBackupToSdcard.error).toBeTruthy();
      });

      it("should restore labels.yml data from backup when SD card has no labels.yml", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create backup with models AND labels.yml
        const labelsYml =
          'Labels:\n  Racing: ""\n  Fixed Wing: ""\nModels:\n  model1.yml:\n    hash: abc123\n    name: Quad Race\n    labels: Racing\n    bitmap: quad.bmp\n    lastopen: 1700000000\n  model2.yml:\n    hash: def456\n    name: Glider\n    labels: Fixed Wing\n    bitmap: glider.bmp\n    lastopen: 1700000001\nSort: 1\n';
        const backupZip = createBackupZip(
          [
            { name: "model1", content: createModelYaml("Quad Race") },
            { name: "model2", content: createModelYaml("Glider") },
          ],
          { "MODELS/labels.yml": labelsYml }
        );

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Pick directory (no labels.yml on SD card)
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Restore backup
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
                overwriteExisting: true
              ) {
                status
                filesWritten
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.restoreBackupToSdcard.status).toBe("completed");

        // Verify labels.yml was created with data from the backup
        const labelsContent = await fs.readFile(
          path.join(modelsPath, "labels.yml"),
          "utf-8"
        );
        expect(labelsContent).toContain("Racing");
        expect(labelsContent).toContain("Fixed Wing");
        expect(labelsContent).toContain("model1.yml");
        expect(labelsContent).toContain("model2.yml");
      });

      it("should restore label assignments from backup labels.yml instead of empty stubs", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create existing labels.yml on SD card
        await fs.writeFile(
          path.join(modelsPath, "labels.yml"),
          'Labels:\n  Existing: ""\nModels: {}\nSort: 1\n'
        );

        // Create backup with labels data
        const labelsYml =
          'Labels:\n  Racing: ""\n  Freestyle: ""\nModels:\n  model1.yml:\n    hash: abc123\n    name: My Racer\n    labels: Racing\n    bitmap: racer.bmp\n    lastopen: 1700000000\nSort: 1\n';
        const backupZip = createBackupZip(
          [{ name: "model1", content: createModelYaml("My Racer") }],
          { "MODELS/labels.yml": labelsYml }
        );

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Restore backup
        const { errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
                overwriteExisting: true
              ) {
                status
                filesWritten
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();

        // Verify labels.yml has the backup's label assignments, not empty stubs
        const labelsContent = await fs.readFile(
          path.join(modelsPath, "labels.yml"),
          "utf-8"
        );
        // Should have labels from backup
        expect(labelsContent).toContain("Racing");
        expect(labelsContent).toContain("Freestyle");
        // Should also keep existing labels
        expect(labelsContent).toContain("Existing");
        // Should contain bitmap from backup (not empty)
        expect(labelsContent).toContain("racer.bmp");
      });
    });

    describe("createBackupFromSdcard", () => {
      it("should create a backup from SD card models", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create model files on SD card
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("My Quad")
        );
        await fs.writeFile(
          path.join(modelsPath, "model2.yml"),
          createModelYaml("Trainer")
        );

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Create backup
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation CreateBackup($directoryId: ID!, $fileName: String) {
              createBackupFromSdcard(
                directoryId: $directoryId
                fileName: $fileName
              ) {
                id
                name
                base64Data
              }
            }
          `,
          variables: {
            directoryId,
            fileName: "my-backup.etx",
          },
        });

        expect(errors).toBeFalsy();
        expect(data?.createBackupFromSdcard).toMatchObject({
          id: expect.any(String),
          name: "my-backup.etx",
        });

        // Verify backup contains models
        const backupBuffer = Buffer.from(
          ((data as any)?.createBackupFromSdcard?.base64Data ?? "") as string,
          "base64"
        );
        const { unzipSync } = await import("fflate");
        const unzipped = unzipSync(new Uint8Array(backupBuffer));

        const files = Object.keys(unzipped);
        expect(files).toContain("MODELS/model1.yml");
        expect(files).toContain("MODELS/model2.yml");
      });

      it("should create backup with only selected models", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create model files
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("Model 1")
        );
        await fs.writeFile(
          path.join(modelsPath, "model2.yml"),
          createModelYaml("Model 2")
        );
        await fs.writeFile(
          path.join(modelsPath, "model3.yml"),
          createModelYaml("Model 3")
        );

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Create backup with selected models
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation CreateBackup(
              $directoryId: ID!
              $selectedModels: [String!]
            ) {
              createBackupFromSdcard(
                directoryId: $directoryId
                selectedModels: $selectedModels
              ) {
                base64Data
              }
            }
          `,
          variables: {
            directoryId,
            selectedModels: ["model1", "model2"],
          },
        });

        expect(errors).toBeFalsy();

        // Verify backup contains only selected models
        const backupBuffer = Buffer.from(
          ((data as any)?.createBackupFromSdcard?.base64Data ?? "") as string,
          "base64"
        );
        const { unzipSync } = await import("fflate");
        const unzipped = unzipSync(new Uint8Array(backupBuffer));

        const files = Object.keys(unzipped);
        expect(files).toContain("MODELS/model1.yml");
        expect(files).toContain("MODELS/model2.yml");
        expect(files).not.toContain("MODELS/model3.yml");
      });
    });

    describe("downloadIndividualModels", () => {
      it("should download individual model files as base64", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create model files
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("My Quad")
        );
        await fs.writeFile(
          path.join(modelsPath, "model2.yml"),
          createModelYaml("Trainer")
        );

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Download models
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation DownloadModels(
              $directoryId: ID!
              $selectedModels: [String!]!
            ) {
              downloadIndividualModels(
                directoryId: $directoryId
                selectedModels: $selectedModels
              ) {
                fileName
                base64Data
              }
            }
          `,
          variables: {
            directoryId,
            selectedModels: ["model1", "model2"],
          },
        });

        expect(errors).toBeFalsy();
        expect(data?.downloadIndividualModels).toHaveLength(2);
        expect(data?.downloadIndividualModels).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ fileName: "model1.yml" }),
            expect.objectContaining({ fileName: "model2.yml" }),
          ])
        );

        // Verify content can be decoded
        const model1 = (
          data?.downloadIndividualModels as {
            fileName: string;
            base64Data: string;
          }[]
        ).find((m) => m.fileName === "model1.yml");
        const content = Buffer.from(
          model1?.base64Data ?? "",
          "base64"
        ).toString("utf-8");
        expect(content).toContain("My Quad");
      });

      it("should download all models when many are selected (e.g. 43)", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create 43 model files to simulate a real-world scenario
        const modelNames: string[] = [];
        for (let i = 1; i <= 43; i += 1) {
          const modelName = `model${i}`;
          modelNames.push(modelName);
          await fs.writeFile(
            path.join(modelsPath, `${modelName}.yml`),
            createModelYaml(`Model ${i}`)
          );
        }

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Download all 43 models
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation DownloadModels(
              $directoryId: ID!
              $selectedModels: [String!]!
            ) {
              downloadIndividualModels(
                directoryId: $directoryId
                selectedModels: $selectedModels
              ) {
                fileName
                base64Data
              }
            }
          `,
          variables: {
            directoryId,
            selectedModels: modelNames,
          },
        });

        expect(errors).toBeFalsy();
        expect(data?.downloadIndividualModels).toHaveLength(43);

        // Verify all 43 files are present
        const downloadedFiles = (
          data?.downloadIndividualModels as {
            fileName: string;
            base64Data: string;
          }[]
        ).map((m) => m.fileName);

        for (let i = 1; i <= 43; i += 1) {
          expect(downloadedFiles).toContain(`model${i}.yml`);
        }

        // Verify content of a few samples
        const model25 = (
          data?.downloadIndividualModels as {
            fileName: string;
            base64Data: string;
          }[]
        ).find((m) => m.fileName === "model25.yml");
        const content = Buffer.from(
          model25?.base64Data ?? "",
          "base64"
        ).toString("utf-8");
        expect(content).toContain("Model 25");
      });

      it("should include labels file when requested", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create model and labels files
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("My Quad")
        );
        await fs.writeFile(
          path.join(modelsPath, "labels.yml"),
          "model1:\n  name: My Quad\n  labels: race\n"
        );

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Download with labels
        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation DownloadModels(
              $directoryId: ID!
              $selectedModels: [String!]!
              $includeLabels: Boolean
            ) {
              downloadIndividualModels(
                directoryId: $directoryId
                selectedModels: $selectedModels
                includeLabels: $includeLabels
              ) {
                fileName
              }
            }
          `,
          variables: {
            directoryId,
            selectedModels: ["model1"],
            includeLabels: true,
          },
        });

        expect(errors).toBeFalsy();
        expect(data?.downloadIndividualModels).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ fileName: "model1.yml" }),
            expect.objectContaining({ fileName: "labels.yml" }),
          ])
        );
      });

      it("should throw error when directory not found", async () => {
        const { errors } = await backend.mutate({
          mutation: gql`
            mutation DownloadModels(
              $directoryId: ID!
              $selectedModels: [String!]!
            ) {
              downloadIndividualModels(
                directoryId: $directoryId
                selectedModels: $selectedModels
              ) {
                fileName
              }
            }
          `,
          variables: {
            directoryId: "nonexistent-directory",
            selectedModels: ["model1"],
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("Directory not found");
      });
    });

    describe("Error handling", () => {
      it("restoreBackupToSdcard should error when backup not found", async () => {
        const { errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
              ) {
                status
                error
              }
            }
          `,
          variables: {
            backupId: "nonexistent-backup",
            directoryId: "some-directory",
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("Backup not found");
      });

      it("createBackupFromSdcard should error when directory not found", async () => {
        const { errors } = await backend.mutate({
          mutation: gql`
            mutation CreateBackup($directoryId: ID!) {
              createBackupFromSdcard(directoryId: $directoryId) {
                id
              }
            }
          `,
          variables: {
            directoryId: "nonexistent-directory",
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("Directory not found");
      });

      it("sdcardModelsWithNames should error when directory not found", async () => {
        const { errors } = await backend.query({
          query: gql`
            query GetModels($directoryId: ID!) {
              sdcardModelsWithNames(directoryId: $directoryId) {
                fileName
              }
            }
          `,
          variables: {
            directoryId: "nonexistent-directory",
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("Directory not found");
      });

      it("checkModelCollisions should error when backup not found", async () => {
        const { errors } = await backend.query({
          query: gql`
            query CheckCollisions($backupId: ID!, $directoryId: ID!) {
              checkModelCollisions(
                backupId: $backupId
                directoryId: $directoryId
              ) {
                fileName
              }
            }
          `,
          variables: {
            backupId: "nonexistent-backup",
            directoryId: "some-directory",
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("Backup not found");
      });

      it("availableModelSlots should error when directory not found", async () => {
        const { errors } = await backend.query({
          query: gql`
            query GetSlots($directoryId: ID!, $count: Int!) {
              availableModelSlots(directoryId: $directoryId, count: $count)
            }
          `,
          variables: {
            directoryId: "nonexistent-directory",
            count: 5,
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("Directory not found");
      });

      it("checkModelCollisions should error when backup exists but directory not found", async () => {
        // First register a backup
        const modelContent = createModelYaml("TestModel");
        const zipBuffer = createBackupZip([
          { name: "model1", content: modelContent },
        ]);
        const base64Data = zipBuffer.toString("base64");

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!, $name: String) {
              registerLocalBackup(backupBase64Data: $data, fileName: $name) {
                id
              }
            }
          `,
          variables: {
            data: base64Data,
            name: "test.etx",
          },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Try to check collisions with nonexistent directory
        const { errors } = await backend.query({
          query: gql`
            query CheckCollisions($backupId: ID!, $directoryId: ID!) {
              checkModelCollisions(
                backupId: $backupId
                directoryId: $directoryId
              ) {
                fileName
              }
            }
          `,
          variables: {
            backupId,
            directoryId: "nonexistent-directory",
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("Directory not found");
      });

      it("restoreBackupToSdcard should error when backup exists but directory not found", async () => {
        // First register a backup
        const modelContent = createModelYaml("TestModel");
        const zipBuffer = createBackupZip([
          { name: "model1", content: modelContent },
        ]);
        const base64Data = zipBuffer.toString("base64");

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!, $name: String) {
              registerLocalBackup(backupBase64Data: $data, fileName: $name) {
                id
              }
            }
          `,
          variables: {
            data: base64Data,
            name: "test.etx",
          },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        // Try to restore to nonexistent directory
        const { errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
              ) {
                status
              }
            }
          `,
          variables: {
            backupId,
            directoryId: "nonexistent-directory",
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("Directory not found");
      });

      it("createBackupFromSdcard should error when no models found", async () => {
        // Create empty MODELS directory
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Try to create backup from empty models directory
        const { errors } = await backend.mutate({
          mutation: gql`
            mutation CreateBackup($directoryId: ID!) {
              createBackupFromSdcard(directoryId: $directoryId) {
                id
              }
            }
          `,
          variables: {
            directoryId,
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("No models found");
        void modelsPath; // Use variable to avoid lint warning
      });

      it("downloadIndividualModels should error when no models found", async () => {
        // Create empty MODELS directory
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Pick directory
        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Try to download nonexistent models
        const { errors } = await backend.mutate({
          mutation: gql`
            mutation DownloadModels(
              $directoryId: ID!
              $selectedModels: [String!]!
            ) {
              downloadIndividualModels(
                directoryId: $directoryId
                selectedModels: $selectedModels
              ) {
                fileName
              }
            }
          `,
          variables: {
            directoryId,
            selectedModels: ["nonexistent01", "nonexistent02"],
          },
        });

        expect(errors).toBeTruthy();
        expect(errors?.[0]?.message).toContain("No models found");
        void modelsPath; // Use variable to avoid lint warning
      });
    });

    describe("macOS resource fork filtering", () => {
      it("should exclude macOS ._ prefix files from model listing", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create a real model and a macOS resource fork
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("Real Model")
        );
        await fs.writeFile(
          path.join(modelsPath, "._model1.yml"),
          "macOS resource fork data"
        );
        await fs.writeFile(
          path.join(modelsPath, "._labels.yml"),
          "macOS resource fork data"
        );

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { data, errors } = await backend.query({
          query: gql`
            query GetModels($directoryId: ID!) {
              sdcardModelsWithNames(directoryId: $directoryId) {
                fileName
                displayName
              }
            }
          `,
          variables: { directoryId },
        });

        expect(errors).toBeFalsy();
        expect(data?.sdcardModelsWithNames).toHaveLength(1);
        expect(data?.sdcardModelsWithNames).toEqual([
          { fileName: "model1", displayName: "Real Model" },
        ]);
      });

      it("should exclude macOS ._ prefix files from backup creation", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("Real Model")
        );
        await fs.writeFile(
          path.join(modelsPath, "._model1.yml"),
          "macOS resource fork data"
        );

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation CreateBackup($directoryId: ID!) {
              createBackupFromSdcard(directoryId: $directoryId) {
                base64Data
              }
            }
          `,
          variables: { directoryId },
        });

        expect(errors).toBeFalsy();

        const backupBuffer = Buffer.from(
          ((data as any)?.createBackupFromSdcard?.base64Data ?? "") as string,
          "base64"
        );
        const { unzipSync } = await import("fflate");
        const unzipped = unzipSync(new Uint8Array(backupBuffer));

        const files = Object.keys(unzipped);
        expect(files).toContain("MODELS/model1.yml");
        expect(files).not.toContain("MODELS/._model1.yml");
      });
    });

    describe("RADIO/radio.yml inclusion", () => {
      it("should include RADIO/radio.yml in backup if it exists", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);
        const radioPath = path.join(tempDir.path, "RADIO");
        await fs.mkdir(radioPath, { recursive: true });

        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("My Model")
        );
        await fs.writeFile(
          path.join(radioPath, "radio.yml"),
          "baud: 115200\nversion: 2.10\n"
        );

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation CreateBackup($directoryId: ID!) {
              createBackupFromSdcard(directoryId: $directoryId) {
                base64Data
              }
            }
          `,
          variables: { directoryId },
        });

        expect(errors).toBeFalsy();

        const backupBuffer = Buffer.from(
          ((data as any)?.createBackupFromSdcard?.base64Data ?? "") as string,
          "base64"
        );
        const { unzipSync } = await import("fflate");
        const unzipped = unzipSync(new Uint8Array(backupBuffer));

        const files = Object.keys(unzipped);
        expect(files).toContain("MODELS/model1.yml");
        expect(files).toContain("RADIO/radio.yml");
      });

      it("should restore RADIO/radio.yml from backup if present", async () => {
        await setupSdcardDirectory(tempDir.path);

        // Create backup with RADIO/radio.yml
        const radioContent = "baud: 115200\nversion: 2.10\n";
        const backupZip = createBackupZip(
          [{ name: "model1", content: createModelYaml("Test") }],
          { "RADIO/radio.yml": radioContent }
        );

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
                overwriteExisting: true
              ) {
                status
                filesWritten
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.restoreBackupToSdcard.status).toBe("completed");

        // Verify RADIO/radio.yml was restored
        const radioPath = path.join(tempDir.path, "RADIO", "radio.yml");
        const restored = await fs.readFile(radioPath, "utf-8");
        expect(restored).toContain("baud: 115200");
      });

      it("should skip RADIO/radio.yml when overwriteExisting is false and radio.yml exists", async () => {
        await setupSdcardDirectory(tempDir.path);

        // Pre-create RADIO/radio.yml on SD card
        const radioPath = path.join(tempDir.path, "RADIO");
        await fs.mkdir(radioPath, { recursive: true });
        await fs.writeFile(
          path.join(radioPath, "radio.yml"),
          "baud: 9600\nversion: 2.8\n"
        );

        // Create backup with different RADIO/radio.yml
        const radioContent = "baud: 115200\nversion: 2.10\n";
        const backupZip = createBackupZip(
          [{ name: "model1", content: createModelYaml("Test") }],
          { "RADIO/radio.yml": radioContent }
        );

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
                overwriteExisting: false
              ) {
                status
                filesWritten
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.restoreBackupToSdcard.status).toBe("completed");

        // Verify RADIO/radio.yml was NOT overwritten
        const restoredRadio = await fs.readFile(
          path.join(radioPath, "radio.yml"),
          "utf-8"
        );
        expect(restoredRadio).toContain("baud: 9600");
        expect(restoredRadio).not.toContain("baud: 115200");
      });

      it("should detect RADIO/radio.yml collision in checkModelCollisions", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Pre-create RADIO/radio.yml on SD card
        const radioPath = path.join(tempDir.path, "RADIO");
        await fs.mkdir(radioPath, { recursive: true });
        await fs.writeFile(
          path.join(radioPath, "radio.yml"),
          "baud: 9600\nversion: 2.8\n"
        );

        // Create a model on SD card
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("Existing Model")
        );

        // Create backup with matching model and RADIO/radio.yml
        const backupZip = createBackupZip(
          [{ name: "model1", content: createModelYaml("Backup Model") }],
          { "RADIO/radio.yml": "baud: 115200\nversion: 2.10\n" }
        );

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Check collisions
        const { data, errors } = await backend.query({
          query: gql`
            query CheckCollisions($backupId: ID!, $directoryId: ID!) {
              checkModelCollisions(
                backupId: $backupId
                directoryId: $directoryId
              ) {
                fileName
                displayName
                existingContent
                backupContent
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();
        const collisions = (data as any)?.checkModelCollisions;
        expect(collisions.length).toBeGreaterThanOrEqual(2);

        // Should have model collision
        const modelCollision = collisions.find(
          (c: any) => c.fileName === "model1"
        );
        expect(modelCollision).toBeDefined();

        // Should have radio.yml collision
        const radioCollision = collisions.find(
          (c: any) => c.fileName === "RADIO/radio.yml"
        );
        expect(radioCollision).toBeDefined();
        expect(radioCollision.existingContent).toContain("baud: 9600");
        expect(radioCollision.backupContent).toContain("baud: 115200");
      });

      it("should detect all collisions even when backup contains .txt files with same base name as .yml", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Pre-create RADIO/radio.yml on SD card
        const radioPath = path.join(tempDir.path, "RADIO");
        await fs.mkdir(radioPath, { recursive: true });
        await fs.writeFile(
          path.join(radioPath, "radio.yml"),
          "baud: 9600\nversion: 2.8\n"
        );

        // Create 3 existing models AND a .txt on SD card
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("Existing Model 1")
        );
        await fs.writeFile(
          path.join(modelsPath, "model1.txt"),
          "Notes for model 1"
        );
        await fs.writeFile(
          path.join(modelsPath, "model2.yml"),
          createModelYaml("Existing Model 2")
        );
        await fs.writeFile(
          path.join(modelsPath, "model3.yml"),
          createModelYaml("Existing Model 3")
        );

        // Create backup with same 3 models + model1.txt + radio.yml
        const backupZip = createBackupZip(
          [
            { name: "model1", content: createModelYaml("Backup Model 1") },
            { name: "model2", content: createModelYaml("Backup Model 2") },
            { name: "model3", content: createModelYaml("Backup Model 3") },
          ],
          {
            "MODELS/model1.txt": "Backup notes for model 1",
            "RADIO/radio.yml": "baud: 115200\nversion: 2.10\n",
          }
        );

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Check collisions — should find all 3 model collisions + radio.yml
        const { data, errors } = await backend.query({
          query: gql`
            query CheckCollisions($backupId: ID!, $directoryId: ID!) {
              checkModelCollisions(
                backupId: $backupId
                directoryId: $directoryId
              ) {
                fileName
                displayName
                existingContent
                backupContent
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();
        const collisions = (data as any)?.checkModelCollisions;
        // 3 model collisions + 1 radio.yml collision = 4 total
        expect(collisions).toHaveLength(4);

        expect(
          collisions.find((c: any) => c.fileName === "model1")
        ).toBeDefined();
        expect(
          collisions.find((c: any) => c.fileName === "model2")
        ).toBeDefined();
        expect(
          collisions.find((c: any) => c.fileName === "model3")
        ).toBeDefined();
        expect(
          collisions.find((c: any) => c.fileName === "RADIO/radio.yml")
        ).toBeDefined();
      });

      it("should detect all collisions with selectedModels param and .txt files present", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Pre-create RADIO/radio.yml on SD card
        const radioPath = path.join(tempDir.path, "RADIO");
        await fs.mkdir(radioPath, { recursive: true });
        await fs.writeFile(
          path.join(radioPath, "radio.yml"),
          "baud: 9600\nversion: 2.8\n"
        );

        // Create 3 existing models AND a .txt on SD card
        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("Existing Model 1")
        );
        await fs.writeFile(
          path.join(modelsPath, "model1.txt"),
          "Notes for model 1"
        );
        await fs.writeFile(
          path.join(modelsPath, "model2.yml"),
          createModelYaml("Existing Model 2")
        );
        await fs.writeFile(
          path.join(modelsPath, "model3.yml"),
          createModelYaml("Existing Model 3")
        );

        // Create backup with same 3 models + model1.txt + radio.yml
        const backupZip = createBackupZip(
          [
            { name: "model1", content: createModelYaml("Backup Model 1") },
            { name: "model2", content: createModelYaml("Backup Model 2") },
            { name: "model3", content: createModelYaml("Backup Model 3") },
          ],
          {
            "MODELS/model1.txt": "Backup notes for model 1",
            "RADIO/radio.yml": "baud: 115200\nversion: 2.10\n",
          }
        );

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        // Check collisions WITH selectedModels (matching real UI flow)
        const { data, errors } = await backend.query({
          query: gql`
            query CheckCollisions(
              $backupId: ID!
              $directoryId: ID!
              $selectedModels: [String!]
            ) {
              checkModelCollisions(
                backupId: $backupId
                directoryId: $directoryId
                selectedModels: $selectedModels
              ) {
                fileName
                displayName
                existingContent
                backupContent
              }
            }
          `,
          variables: {
            backupId,
            directoryId,
            selectedModels: ["model1", "model2", "model3"],
          },
        });

        expect(errors).toBeFalsy();
        const collisions = (data as any)?.checkModelCollisions;
        // 3 model collisions + 1 radio.yml collision = 4 total
        expect(collisions).toHaveLength(4);

        expect(
          collisions.find((c: any) => c.fileName === "model1")
        ).toBeDefined();
        expect(
          collisions.find((c: any) => c.fileName === "model2")
        ).toBeDefined();
        expect(
          collisions.find((c: any) => c.fileName === "model3")
        ).toBeDefined();
        expect(
          collisions.find((c: any) => c.fileName === "RADIO/radio.yml")
        ).toBeDefined();
      });
    });

    describe("MODELS/*.txt file inclusion", () => {
      it("should include MODELS/*.txt files in backup", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        await fs.writeFile(
          path.join(modelsPath, "model1.yml"),
          createModelYaml("My Model")
        );
        await fs.writeFile(
          path.join(modelsPath, "model1.txt"),
          "Model notes for My Model"
        );
        await fs.writeFile(
          path.join(modelsPath, "model2.txt"),
          "Notes for another model"
        );

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation CreateBackup($directoryId: ID!) {
              createBackupFromSdcard(directoryId: $directoryId) {
                base64Data
              }
            }
          `,
          variables: { directoryId },
        });

        expect(errors).toBeFalsy();

        const backupBuffer = Buffer.from(
          ((data as any)?.createBackupFromSdcard?.base64Data ?? "") as string,
          "base64"
        );
        const { unzipSync } = await import("fflate");
        const unzipped = unzipSync(new Uint8Array(backupBuffer));

        const files = Object.keys(unzipped);
        expect(files).toContain("MODELS/model1.yml");
        expect(files).toContain("MODELS/model1.txt");
        expect(files).toContain("MODELS/model2.txt");
      });

      it("should restore MODELS/*.txt files from backup", async () => {
        await setupSdcardDirectory(tempDir.path);

        // Create backup with model and .txt files
        const backupZip = createBackupZip(
          [{ name: "model1", content: createModelYaml("Test") }],
          {
            "MODELS/model1.txt": "Model notes content",
            "MODELS/model2.txt": "Another notes file",
          }
        );

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { data, errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
                overwriteExisting: true
              ) {
                status
                filesWritten
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.restoreBackupToSdcard.status).toBe("completed");

        // Verify .txt files were restored
        const txt1 = await fs.readFile(
          path.join(tempDir.path, "MODELS", "model1.txt"),
          "utf-8"
        );
        expect(txt1).toBe("Model notes content");

        const txt2 = await fs.readFile(
          path.join(tempDir.path, "MODELS", "model2.txt"),
          "utf-8"
        );
        expect(txt2).toBe("Another notes file");
      });

      it("should skip MODELS/*.txt files when overwriteExisting is false and they exist", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Pre-create a .txt file on SD card
        await fs.writeFile(
          path.join(modelsPath, "model1.txt"),
          "Original notes"
        );

        // Create backup with same .txt file
        const backupZip = createBackupZip(
          [{ name: "model1", content: createModelYaml("Test") }],
          { "MODELS/model1.txt": "Updated notes" }
        );

        const registerResult = await backend.mutate({
          mutation: gql`
            mutation RegisterBackup($data: String!) {
              registerLocalBackup(backupBase64Data: $data) {
                id
              }
            }
          `,
          variables: { data: backupZip.toString("base64") },
        });

        const backupId = (registerResult.data?.registerLocalBackup as any)?.id;

        const handle = await getOriginPrivateDirectory(
          nodeAdapter,
          tempDir.path
        );
        // @ts-expect-error readonly but testing
        handle.name = tempDir.path;
        requestWritableDirectory.mockResolvedValueOnce(handle);

        const pickResult = await backend.mutate({
          mutation: gql`
            mutation {
              pickSdcardDirectory {
                id
              }
            }
          `,
        });

        const directoryId = (pickResult.data?.pickSdcardDirectory as any)?.id;

        const { errors } = await backend.mutate({
          mutation: gql`
            mutation RestoreBackup($backupId: ID!, $directoryId: ID!) {
              restoreBackupToSdcard(
                backupId: $backupId
                directoryId: $directoryId
                overwriteExisting: false
              ) {
                status
                filesWritten
              }
            }
          `,
          variables: { backupId, directoryId },
        });

        expect(errors).toBeFalsy();

        // Verify .txt file was NOT overwritten
        const txt = await fs.readFile(
          path.join(modelsPath, "model1.txt"),
          "utf-8"
        );
        expect(txt).toBe("Original notes");
      });
    });

    describe("firmware-constants", () => {
      it("MAX_MODELS_BW should be 60", () => {
        expect(MAX_MODELS_BW).toBe(60);
      });

      it("MAX_MODELS_COLOR should be 99", () => {
        expect(MAX_MODELS_COLOR).toBe(99);
      });
    });
  });
});
