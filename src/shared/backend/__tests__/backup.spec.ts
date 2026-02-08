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
const createBackupZip = (models: { name: string; content: string }[]) => {
  // Create the ZIP in a separate Node process to avoid jsdom issues
  const modelsJson = JSON.stringify(models);
  const script = `
    const fflate = require('fflate');
    const models = JSON.parse(process.argv[1]);
    const files = {};
    for (const model of models) {
      files['MODELS/' + model.name + '.yml'] = new TextEncoder().encode(model.content);
    }
    const zipped = fflate.zipSync(files, { level: 6 });
    process.stdout.write(Buffer.from(zipped).toString('base64'));
  `;

  const result = execSync(
    `node -e "${script
      .replace(/"/g, '\\"')
      .replace(/\n/g, " ")}" '${modelsJson}'`,
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
          { name: "model01", content: modelContent },
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
          path.join(modelsPath, "model01.yml"),
          createModelYaml("My Quad")
        );
        await fs.writeFile(
          path.join(modelsPath, "model02.yml"),
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
            { fileName: "model01", displayName: "My Quad" },
            { fileName: "model02", displayName: "Trainer Plane" },
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
          path.join(modelsPath, "model01.yml"),
          createModelYaml("Existing Model")
        );

        // Register backup with same model name
        const backupZip = createBackupZip([
          { name: "model01", content: createModelYaml("Backup Model") },
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
          fileName: "model01",
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

        // Create existing model with different name
        await fs.writeFile(
          path.join(modelsPath, "model01.yml"),
          createModelYaml("Existing Model")
        );

        // Register backup with different model name
        const backupZip = createBackupZip([
          { name: "model02", content: createModelYaml("Backup Model") },
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

      it("should return available model slots", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create some existing models (slots 1 and 2 are taken)
        await fs.writeFile(
          path.join(modelsPath, "model01.yml"),
          createModelYaml("Model 1")
        );
        await fs.writeFile(
          path.join(modelsPath, "model02.yml"),
          createModelYaml("Model 2")
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
          "model03",
          "model04",
          "model05",
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
          { name: "model01", content: modelContent },
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
          { name: "model01", content: createModelYaml("TestModel") },
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
            { name: `model0${i}`, content: createModelYaml(`Model ${i}`) },
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
          { name: "model01", content: createModelYaml("Restored Model 1") },
          { name: "model02", content: createModelYaml("Restored Model 2") },
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
          path.join(modelsPath, "model01.yml"),
          "utf-8"
        );
        expect(model1Content).toContain("Restored Model 1");

        const model2Content = await fs.readFile(
          path.join(modelsPath, "model02.yml"),
          "utf-8"
        );
        expect(model2Content).toContain("Restored Model 2");
      });

      it("should restore only selected models", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Register backup with multiple models
        const backupZip = createBackupZip([
          { name: "model01", content: createModelYaml("Model 1") },
          { name: "model02", content: createModelYaml("Model 2") },
          { name: "model03", content: createModelYaml("Model 3") },
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

        // Restore only model01 and model03
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
            selectedModels: ["model01", "model03"],
          },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.restoreBackupToSdcard.filesWritten).toBe(2);

        // Verify only selected files exist
        const files = await fs.readdir(modelsPath);
        expect(files).toContain("model01.yml");
        expect(files).toContain("model03.yml");
        expect(files).not.toContain("model02.yml");
      });

      it("should rename models when modelRenames is provided", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Register backup
        const backupZip = createBackupZip([
          { name: "model01", content: createModelYaml("Original Model") },
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
            modelRenames: JSON.stringify({ model01: "model99" }),
          },
        });

        expect(errors).toBeFalsy();
        expect((data as any)?.restoreBackupToSdcard.filesWritten).toBe(1);

        // Verify renamed file exists
        const files = await fs.readdir(modelsPath);
        expect(files).toContain("model99.yml");
        expect(files).not.toContain("model01.yml");
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
    });

    describe("createBackupFromSdcard", () => {
      it("should create a backup from SD card models", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create model files on SD card
        await fs.writeFile(
          path.join(modelsPath, "model01.yml"),
          createModelYaml("My Quad")
        );
        await fs.writeFile(
          path.join(modelsPath, "model02.yml"),
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
        expect(files).toContain("MODELS/model01.yml");
        expect(files).toContain("MODELS/model02.yml");
      });

      it("should create backup with only selected models", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create model files
        await fs.writeFile(
          path.join(modelsPath, "model01.yml"),
          createModelYaml("Model 1")
        );
        await fs.writeFile(
          path.join(modelsPath, "model02.yml"),
          createModelYaml("Model 2")
        );
        await fs.writeFile(
          path.join(modelsPath, "model03.yml"),
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
            selectedModels: ["model01", "model03"],
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
        expect(files).toContain("MODELS/model01.yml");
        expect(files).toContain("MODELS/model03.yml");
        expect(files).not.toContain("MODELS/model02.yml");
      });
    });

    describe("downloadIndividualModels", () => {
      it("should download individual model files as base64", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create model files
        await fs.writeFile(
          path.join(modelsPath, "model01.yml"),
          createModelYaml("My Quad")
        );
        await fs.writeFile(
          path.join(modelsPath, "model02.yml"),
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
            selectedModels: ["model01", "model02"],
          },
        });

        expect(errors).toBeFalsy();
        expect(data?.downloadIndividualModels).toHaveLength(2);
        expect(data?.downloadIndividualModels).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ fileName: "model01.yml" }),
            expect.objectContaining({ fileName: "model02.yml" }),
          ])
        );

        // Verify content can be decoded
        const model1 = (
          data?.downloadIndividualModels as {
            fileName: string;
            base64Data: string;
          }[]
        ).find((m) => m.fileName === "model01.yml");
        const content = Buffer.from(
          model1?.base64Data ?? "",
          "base64"
        ).toString("utf-8");
        expect(content).toContain("My Quad");
      });

      it("should include labels file when requested", async () => {
        const modelsPath = await setupSdcardDirectory(tempDir.path);

        // Create model and labels files
        await fs.writeFile(
          path.join(modelsPath, "model01.yml"),
          createModelYaml("My Quad")
        );
        await fs.writeFile(
          path.join(modelsPath, "labels.yml"),
          "model01:\n  name: My Quad\n  labels: race\n"
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
            selectedModels: ["model01"],
            includeLabels: true,
          },
        });

        expect(errors).toBeFalsy();
        expect(data?.downloadIndividualModels).toEqual(
          expect.arrayContaining([
            expect.objectContaining({ fileName: "model01.yml" }),
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
            selectedModels: ["model01"],
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
          { name: "model01", content: modelContent },
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
          { name: "model01", content: modelContent },
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
  });
});
