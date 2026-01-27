import { createBuilder } from "shared/backend/utils/builder";
import { GraphQLError } from "graphql";

const builder = createBuilder();

const LocalEdgeTxBackup = builder.simpleObject("LocalEdgeTxBackup", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    base64Data: t.string(),
  }),
});

const IndividualModelFile = builder.simpleObject("IndividualModelFile", {
  fields: (t) => ({
    fileName: t.string(),
    base64Data: t.string(),
  }),
});

const BackupRestoreJob = builder.simpleObject("BackupRestoreJob", {
  fields: (t) => ({
    id: t.id(),
    status: t.string(),
    progress: t.float(),
    error: t.string({ nullable: true }),
    filesWritten: t.int(),
    totalFiles: t.int(),
  }),
});

const SdcardModelInfo = builder.simpleObject("SdcardModelInfo", {
  fields: (t) => ({
    fileName: t.string(),
    displayName: t.string(),
  }),
});

const ModelCollisionInfo = builder.simpleObject("ModelCollisionInfo", {
  fields: (t) => ({
    fileName: t.string(),
    displayName: t.string(),
    existingContent: t.string(),
    backupContent: t.string(),
  }),
});

builder.queryType({
  fields: (t) => ({
    localBackup: t.field({
      type: LocalEdgeTxBackup,
      nullable: true,
      args: {
        byId: t.arg.id({ required: true }),
      },
      resolve: (_, { byId }, { backupStore }) => {
        const file = backupStore.getLocalBackupById(byId.toString());

        if (!file) {
          return null;
        }

        return {
          id: file.id,
          name: file.name ?? file.id,
          base64Data: file.data.toString("base64"),
        };
      },
    }),
    sdcardModelsWithNames: t.field({
      type: [SdcardModelInfo],
      args: {
        directoryId: t.arg.id({ required: true }),
      },
      resolve: async (_, { directoryId }, { backupStore }) => {
        const { getDirectoryHandleById } = await import(
          "./sdcard-directory-store"
        );
        const directoryHandle = getDirectoryHandleById(directoryId.toString());

        if (!directoryHandle) {
          throw new GraphQLError(
            "Directory not found. Please select SD Card again."
          );
        }

        try {
          return await backupStore.getModelsWithNames(directoryHandle);
        } catch (error) {
          throw new GraphQLError(
            error instanceof Error ? error.message : "Failed to read models"
          );
        }
      },
    }),
    checkModelCollisions: t.field({
      type: [ModelCollisionInfo],
      args: {
        backupId: t.arg.id({ required: true }),
        directoryId: t.arg.id({ required: true }),
        selectedModels: t.arg.stringList(),
      },
      resolve: async (
        _,
        { backupId, directoryId, selectedModels },
        { backupStore }
      ) => {
        const backup = backupStore.getLocalBackupById(backupId.toString());

        if (!backup) {
          throw new GraphQLError("Backup not found");
        }

        const { getDirectoryHandleById } = await import(
          "./sdcard-directory-store"
        );
        const directoryHandle = getDirectoryHandleById(directoryId.toString());

        if (!directoryHandle) {
          throw new GraphQLError(
            "Directory not found. Please select SD Card again."
          );
        }

        try {
          return await backupStore.checkModelCollisions(
            backup,
            directoryHandle,
            selectedModels ?? undefined
          );
        } catch (error) {
          throw new GraphQLError(
            error instanceof Error
              ? error.message
              : "Failed to check collisions"
          );
        }
      },
    }),
    availableModelSlots: t.stringList({
      args: {
        directoryId: t.arg.id({ required: true }),
        count: t.arg.int({ required: true }),
      },
      resolve: async (_, { directoryId, count }, { backupStore }) => {
        const { getDirectoryHandleById } = await import(
          "./sdcard-directory-store"
        );
        const directoryHandle = getDirectoryHandleById(directoryId.toString());

        if (!directoryHandle) {
          throw new GraphQLError(
            "Directory not found. Please select SD Card again."
          );
        }

        try {
          return await backupStore.findAvailableModelSlots(
            directoryHandle,
            count
          );
        } catch (error) {
          throw new GraphQLError(
            error instanceof Error
              ? error.message
              : "Failed to find available slots"
          );
        }
      },
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    registerLocalBackup: t.field({
      type: LocalEdgeTxBackup,
      args: {
        fileName: t.arg.string({
          required: false,
        }),
        backupBase64Data: t.arg.string({ required: true }),
      },
      resolve: (_, { fileName, backupBase64Data }, { backupStore }) => {
        const id = backupStore.registerBackup(
          Buffer.from(backupBase64Data, "base64"),
          fileName ?? undefined
        );

        return { id, name: fileName ?? id, base64Data: backupBase64Data };
      },
    }),
    restoreBackupToSdcard: t.field({
      type: BackupRestoreJob,
      args: {
        backupId: t.arg.id({ required: true }),
        directoryId: t.arg.id({ required: true }),
        selectedModels: t.arg.stringList(),
        overwriteExisting: t.arg.boolean(),
        modelRenames: t.arg.string({ required: false }),
      },
      resolve: async (
        _,
        {
          backupId,
          directoryId,
          selectedModels,
          overwriteExisting,
          modelRenames,
        },
        { backupStore }
      ) => {
        const backup = backupStore.getLocalBackupById(backupId.toString());

        if (!backup) {
          throw new GraphQLError("Backup not found");
        }

        // Import the directories array from sdcard module
        // This is a bit hacky but necessary to access the directory handle
        const { getDirectoryHandleById } = await import(
          "./sdcard-directory-store"
        );
        const directoryHandle = getDirectoryHandleById(directoryId.toString());

        if (!directoryHandle) {
          throw new GraphQLError(
            "Directory not found. Please select SD Card again."
          );
        }

        // Parse modelRenames JSON if provided
        const renamesMap = modelRenames
          ? (JSON.parse(modelRenames) as Record<string, string>)
          : undefined;

        // Execute the restore operation
        try {
          const result = await backupStore.restoreBackupToDirectory(
            backup,
            directoryHandle,
            {
              selectedModels: selectedModels ?? undefined,
              overwriteExisting: overwriteExisting ?? true,
              modelRenames: renamesMap,
            }
          );

          return {
            id: backupId.toString(),
            status: result.success ? "completed" : "completed_with_errors",
            progress: 100,
            error: result.errors.length > 0 ? result.errors.join("; ") : null,
            filesWritten: result.filesWritten,
            totalFiles: selectedModels?.length ?? result.filesWritten,
          };
        } catch (error) {
          return {
            id: backupId.toString(),
            status: "failed",
            progress: 0,
            error: error instanceof Error ? error.message : "Unknown error",
            filesWritten: 0,
            totalFiles: selectedModels?.length ?? 0,
          };
        }
      },
    }),
    createBackupFromSdcard: t.field({
      type: LocalEdgeTxBackup,
      args: {
        directoryId: t.arg.id({ required: true }),
        selectedModels: t.arg.stringList(),
        fileName: t.arg.string(),
        includeLabels: t.arg.boolean(),
      },
      resolve: async (
        _,
        { directoryId, selectedModels, fileName, includeLabels },
        { backupStore }
      ) => {
        const { getDirectoryHandleById } = await import(
          "./sdcard-directory-store"
        );
        const directoryHandle = getDirectoryHandleById(directoryId.toString());

        if (!directoryHandle) {
          throw new GraphQLError(
            "Directory not found. Please select SD Card again."
          );
        }

        try {
          const backupData = await backupStore.createBackupFromDirectory(
            directoryHandle,
            {
              selectedModels: selectedModels ?? undefined,
              includeLabels: includeLabels ?? false,
            }
          );

          const isoDate: string = new Date()
            .toISOString()
            .split("T")[0] as string;
          const name = fileName ?? `backup-${isoDate}.etx`;
          const id = backupStore.registerBackup(backupData, name);

          return {
            id,
            name,
            base64Data: backupData.toString("base64"),
          };
        } catch (error) {
          throw new GraphQLError(
            error instanceof Error ? error.message : "Failed to create backup"
          );
        }
      },
    }),
    downloadIndividualModels: t.field({
      type: [IndividualModelFile],
      args: {
        directoryId: t.arg.id({ required: true }),
        selectedModels: t.arg.stringList({ required: true }),
        includeLabels: t.arg.boolean(),
      },
      resolve: async (
        _,
        { directoryId, selectedModels, includeLabels },
        { backupStore }
      ) => {
        const { getDirectoryHandleById } = await import(
          "./sdcard-directory-store"
        );
        const directoryHandle = getDirectoryHandleById(directoryId.toString());

        if (!directoryHandle) {
          throw new GraphQLError(
            "Directory not found. Please select SD Card again."
          );
        }

        try {
          const files = await backupStore.downloadIndividualModels(
            directoryHandle,
            {
              selectedModels,
              includeLabels: Boolean(includeLabels),
            }
          );

          return files.map((file) => ({
            fileName: file.fileName,
            base64Data: file.base64Data,
          }));
        } catch (error) {
          throw new GraphQLError(
            error instanceof Error ? error.message : "Failed to download models"
          );
        }
      },
    }),
  }),
});

export default {
  schema: builder.toSchema({}),
};
