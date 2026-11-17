import { FolderOpenTwoTone, CheckCircleOutlined } from "@ant-design/icons";
import {
  Button,
  Divider,
  Tooltip,
  Progress,
  Modal,
  Typography,
  Card,
  Switch,
} from "antd";
import React, { useState } from "react";
import { useMutation, useQuery, useLazyQuery } from "@apollo/client";
import { gql } from "graphql-tag";
import useQueryParams from "renderer/hooks/useQueryParams";
import environment from "shared/environment";
import { getMaxModels, modelSlotName } from "shared/firmware-constants";
import checks from "renderer/compatibility/checks";
import { useTranslation } from "react-i18next";
import yaml from "yaml";
import { zipSync } from "fflate";
import BackupUploader from "./file/BackupUploader";
import CollisionModal from "./CollisionModal";
import DiffViewerModal from "./DiffViewerModal";

type ModelItem = {
  id: string;
  fileName: string;
  displayName: string;
  content: Record<string, unknown>;
  source: string;
};

const notAvailable = !environment.isElectron && !checks.hasFilesystemApi;

const BackupRestoreFlow: React.FC = () => {
  const { t } = useTranslation("backup");

  const [directory, setDirectory] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [progress, setProgress] = useState(0);
  const [previewModel, setPreviewModel] = useState<{
    name: string;
    content: string;
  } | null>(null);
  const [collisionDetection, setCollisionDetection] = useState(true);
  const [pendingRestore, setPendingRestore] = useState<{
    models: ModelItem[];
  } | null>(null);
  const [collisions, setCollisions] = useState<
    {
      fileName: string;
      displayName: string;
      existingContent: string;
      backupContent: string;
    }[]
  >([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [showCollisionModal, setShowCollisionModal] = useState(false);
  const [diffModel, setDiffModel] = useState<{
    fileName: string;
    existingContent: string;
    backupContent: string;
  } | null>(null);

  const { parseParam, updateParams } = useQueryParams<
    "version" | "target" | "filters" | "selectedFlags"
  >();

  const [selectDirectory] = useMutation(
    gql(/* GraphQL */ `
      mutation PickSdcardDirectory {
        pickSdcardDirectory {
          id
        }
      }
    `)
  );

  const [restoreModelsDirectly] = useMutation(
    gql(/* GraphQL */ `
      mutation RestoreBackupToSdcardDirect(
        $backupId: ID!
        $directoryId: ID!
        $selectedModels: [String!]
        $overwriteExisting: Boolean
        $modelRenames: String
      ) {
        restoreBackupToSdcard(
          backupId: $backupId
          directoryId: $directoryId
          selectedModels: $selectedModels
          overwriteExisting: $overwriteExisting
          modelRenames: $modelRenames
        ) {
          id
          status
          progress
          error
          filesWritten
          totalFiles
        }
      }
    `)
  );

  const [registerBackup] = useMutation(
    gql(/* GraphQL */ `
      mutation RegisterLocalBackupForRestore($name: String!, $data: String!) {
        registerLocalBackup(backupBase64Data: $data, fileName: $name) {
          id
          name
        }
      }
    `)
  );

  const [checkCollisionsQuery] = useLazyQuery(
    gql(/* GraphQL */ `
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
    `) as import("@apollo/client").DocumentNode
  );

  const { data } = useQuery(
    gql(/* GraphQL */ `
      query SdcardModelsInfo($directoryId: ID!) {
        sdcardModelsDirectory(id: $directoryId) {
          id
          name
          isValid
          pack {
            target
            version
          }
          models
          hasLabels
        }
      }
    `),
    {
      variables: {
        directoryId: directory ?? "",
      },
      skip: !directory,
      fetchPolicy: "cache-and-network",
    }
  );

  const version = parseParam("version");
  const target = parseParam("target");

  const directoryData = data?.sdcardModelsDirectory as
    | {
        id: string;
        name: string;
        models: string[];
        hasLabels?: boolean;
        isValid: boolean;
      }
    | undefined;

  const handleRestoreModels = async (models: ModelItem[]): Promise<void> => {
    if (!directory) {
      Modal.error({
        title: "Error",
        content: t("Please select SD Card first"),
      });
      return;
    }

    // Check if we need to check collisions (when collision detection is enabled)
    if (collisionDetection) {
      try {
        // Determine which backup ID to use for collision checking
        const backupIdForCheck = await getBackupIdForCollisionCheck(models);
        if (!backupIdForCheck) {
          Modal.error({
            title: t("Error"),
            content: t("Error creating temporary backup"),
          });
          return;
        }

        // For .etx backups, always check via backend (catches radio.yml collisions too)
        // For individual files, only check if there are potential model collisions
        const hasOriginalBackup = version === "local" && target;
        const existingModelNames = new Set(directoryData?.models ?? []);
        const collidingModelNames = models
          .filter((model) => existingModelNames.has(model.fileName))
          .map((m) => m.fileName);

        if (hasOriginalBackup || collidingModelNames.length > 0) {
          // Query backend for collision details including YAML content
          // Always send all model names so the backend can check all of them
          const collisionResult = await checkCollisionsQuery({
            variables: {
              backupId: backupIdForCheck,
              directoryId: directory,
              selectedModels: models.map((m) => m.fileName),
            },
          });

          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const collisionData = collisionResult.data?.checkModelCollisions as
            | {
                fileName: string;
                displayName: string;
                existingContent: string;
                backupContent: string;
              }[]
            | undefined;

          if (collisionData && collisionData.length > 0) {
            // Generate available slot names for model collisions only
            const modelCollisions = collisionData.filter(
              (c) => !c.fileName.includes("/")
            );
            if (modelCollisions.length > 0 && directoryData?.models) {
              const hasLabels = directoryData.hasLabels ?? false;
              const maxModels = getMaxModels(hasLabels);
              const existingNames = new Set(directoryData.models);
              const slots: string[] = [];
              for (let i = 1; i <= maxModels; i += 1) {
                const slotName = modelSlotName(i, hasLabels);
                if (!existingNames.has(slotName)) {
                  slots.push(slotName);
                }
              }
              setAvailableSlots(slots);
            }

            setCollisions(collisionData);
            setPendingRestore({ models });
            setShowCollisionModal(true);
            return;
          }
        }
      } catch (error) {
        // Continue with restore without collision details
      }
    }

    // No collision check needed or no collisions found, proceed with restore
    executeRestore(models, {}, !collisionDetection);
  };

  /**
   * Get a backup ID suitable for collision checking.
   * Uses the original .etx backup when available, otherwise creates a temp backup.
   */
  const getBackupIdForCollisionCheck = async (
    models: ModelItem[]
  ): Promise<string | null> => {
    // Use original .etx backup if available (includes radio.yml for collision checks)
    if (version === "local" && target) {
      return target;
    }

    return createTemporaryBackupFromModels(models);
  };

  const createTemporaryBackupFromModels = async (
    models: ModelItem[]
  ): Promise<string | null> => {
    // Create files object for the ZIP
    const files: Record<string, Uint8Array> = {};

    models.forEach((model) => {
      const yamlContent = yaml.stringify(model.content);
      const buffer = new TextEncoder().encode(yamlContent);
      files[`MODELS/${model.fileName}.yml`] = buffer;
    });

    // Create ZIP file
    const zipped = zipSync(files, {
      level: 6,
      mtime: new Date(),
    });

    // Convert to base64
    const base64 = btoa(String.fromCharCode(...zipped));

    try {
      // Register the backup
      const result = await registerBackup({
        variables: {
          name: `temp-collision-check-${Date.now()}.etx`,
          data: base64,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return result.data?.registerLocalBackup.id ?? null;
    } catch (error) {
      return null;
    }
  };

  const executeRestore = (
    models: ModelItem[],
    modelRenames: Record<string, string>,
    overwrite: boolean
  ): void => {
    setRestoring(true);
    setProgress(0);

    // Get backup ID — use original .etx backup when available (preserves radio.yml and .txt files)
    const getBackupId = async (): Promise<string> => {
      if (version === "local" && target) {
        return target;
      }

      // Create a temporary backup with the selected models
      const files: Record<string, Uint8Array> = {};

      models.forEach((model) => {
        const yamlContent = yaml.stringify(model.content);
        const buffer = new TextEncoder().encode(yamlContent);
        files[`MODELS/${model.fileName}.yml`] = buffer;
      });

      // Create ZIP file
      const zipped = zipSync(files, {
        level: 6,
        mtime: new Date(),
      });

      // Convert to base64
      const base64 = btoa(String.fromCharCode(...zipped));

      // Register the backup
      const result = await registerBackup({
        variables: {
          name: `temp-restore-${Date.now()}.etx`,
          data: base64,
        },
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-member-access
      return result.data?.registerLocalBackup.id ?? "";
    };

    void getBackupId()
      .then((backupId) => {
        if (!backupId) {
          Modal.error({
            title: t("Error"),
            content: t("Error creating temporary backup"),
          });
          setRestoring(false);
          return;
        }

        // Now restore using the registered backup
        void restoreModelsDirectly({
          variables: {
            backupId,
            directoryId: directory ?? "",
            selectedModels: models.map((m) => m.fileName),
            overwriteExisting: overwrite,
            modelRenames:
              Object.keys(modelRenames).length > 0
                ? JSON.stringify(modelRenames)
                : undefined,
          },
        })
          .then((result) => {
            setProgress(100);

            const filesWritten =
              result.data?.restoreBackupToSdcard.totalFiles ?? models.length;

            Modal.success({
              title: t("Done"),
              content: (
                <div>
                  <p>{t("Models restored successfully")}</p>
                  <Typography.Text type="secondary">
                    {t("{{count}} models restored", { count: filesWritten })}
                  </Typography.Text>
                </div>
              ),
            });

            setTimeout(() => {
              setRestoring(false);
              setProgress(0);
            }, 1000);
          })
          .catch((e: Error) => {
            Modal.error({
              title: t("Error restoring models"),
              content: e.message,
            });
            setRestoring(false);
            setProgress(0);
          });

        // Simulate progress
        const interval = setInterval(() => {
          setProgress((prev) => {
            if (prev >= 90) {
              clearInterval(interval);
              return prev;
            }
            return prev + 10;
          });
        }, 200);
      })
      .catch((e: Error) => {
        Modal.error({
          title: t("Error preparing restore"),
          content: e.message,
        });
        setRestoring(false);
        setProgress(0);
      });
  };

  const handleCollisionResolve = (
    renames: Record<string, string>,
    overwrite: boolean
  ): void => {
    setShowCollisionModal(false);
    if (pendingRestore) {
      executeRestore(pendingRestore.models, renames, overwrite);
      setPendingRestore(null);
    }
  };

  const handlePreviewModel = (
    modelContent: Record<string, unknown>,
    modelName: string
  ): void => {
    setPreviewModel({
      name: modelName,
      content: yaml.stringify(modelContent),
    });
  };

  const backupUploadArea = (
    <BackupUploader
      selectedFile={version === "local" ? target : undefined}
      directorySelected={!!directory}
      onFileUploaded={(fileId) => {
        if (fileId) {
          updateParams({
            target: fileId,
            version: "local",
          });
        } else {
          updateParams({
            target: undefined,
            version: undefined,
          });
        }
      }}
      onRestoreModels={handleRestoreModels}
      onPreviewModel={handlePreviewModel}
      onResetAfterRestore={() => {
        // Clear file selection and deselect SD card after restore
        setDirectory(null);
        updateParams({
          target: undefined,
          version: undefined,
        });
      }}
      restoring={restoring}
    />
  );

  const backupSDCardArea = (
    <Card size="small">
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {!directory ? (
          <>
            <FolderOpenTwoTone
              style={{
                fontSize: "32px",
                opacity: notAvailable ? "0.2" : undefined,
              }}
            />
            <div style={{ flex: 1 }}>
              <Typography.Text strong>{t(`SD Card`)}</Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
                  {t(`Select your SD Card to restore models`)}
                </Typography.Text>
              </div>
            </div>
            <Tooltip
              trigger={notAvailable ? ["hover", "click"] : []}
              placement="left"
              title={t(`This feature is not supported by your browser`)}
            >
              <Button
                type="primary"
                disabled={notAvailable}
                onClick={() => {
                  void selectDirectory().then((result) => {
                    if (result.data?.pickSdcardDirectory) {
                      const pickedDirectoryData =
                        result.data.pickSdcardDirectory;
                      setDirectory(pickedDirectoryData.id);
                      Modal.success({
                        title: t("Done"),
                        content: t("SD Card selected successfully"),
                      });
                    }
                  });
                }}
              >
                {t(`Select SD Card`)}
              </Button>
            </Tooltip>
          </>
        ) : (
          <>
            <CheckCircleOutlined
              style={{
                fontSize: "32px",
                color: "#52c41a",
              }}
            />
            <div style={{ flex: 1 }}>
              <Typography.Text strong>
                {directoryData?.name ?? t(`SD Card`)}
              </Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
                  {(() => {
                    if (
                      directoryData?.models &&
                      directoryData.models.length > 0
                    ) {
                      return `${directoryData.models.length} ${t(
                        `models available`
                      )}${
                        directoryData.hasLabels
                          ? ` ${t(`and labels file found`)}`
                          : ""
                      }`;
                    }
                    if (directoryData?.hasLabels) {
                      return t(`Labels file found, no models`);
                    }
                    return t(`Ready to restore`);
                  })()}
                </Typography.Text>
              </div>
            </div>
            <Button
              size="small"
              onClick={() => {
                void selectDirectory().then((result) => {
                  if (result.data?.pickSdcardDirectory) {
                    const pickedDirectoryData = result.data.pickSdcardDirectory;
                    setDirectory(pickedDirectoryData.id);
                    Modal.success({
                      title: t("Done"),
                      content: t("SD Card selected successfully"),
                    });
                  }
                });
              }}
            >
              {t(`Change`)}
            </Button>
          </>
        )}
      </div>
    </Card>
  );

  return (
    <>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          width: "100%",
          padding: "8px 0",
        }}
      >
        {backupSDCardArea}

        <Card size="small">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div>
              <Typography.Text strong>
                {t("Collision detection")}
              </Typography.Text>
              <div>
                <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
                  {t(
                    "When enabled, you'll be asked how to handle models that already exist on your SD card"
                  )}
                </Typography.Text>
              </div>
            </div>
            <Switch
              checked={collisionDetection}
              onChange={setCollisionDetection}
            />
          </div>
        </Card>

        <Divider style={{ margin: 0 }} />
        <div style={{ width: "100%", minHeight: "400px" }}>
          {backupUploadArea}
        </div>
        {restoring && (
          <div style={{ width: "100%", padding: "16px" }}>
            <Typography.Text>{t(`Restoring models...`)}</Typography.Text>
            <Progress percent={progress} status="active" />
          </div>
        )}
      </div>

      <CollisionModal
        visible={showCollisionModal}
        collisions={collisions}
        availableSlots={availableSlots}
        onCancel={() => {
          setShowCollisionModal(false);
          setPendingRestore(null);
        }}
        onResolve={handleCollisionResolve}
        onViewDiff={(collision) => {
          setDiffModel({
            fileName: collision.displayName,
            existingContent: collision.existingContent,
            backupContent: collision.backupContent,
          });
        }}
      />

      <DiffViewerModal
        visible={!!diffModel}
        modelName={diffModel?.fileName ?? ""}
        existingContent={diffModel?.existingContent ?? ""}
        backupContent={diffModel?.backupContent ?? ""}
        onClose={() => setDiffModel(null)}
      />

      <Modal
        title={`${t(`Model preview`)} - ${previewModel?.name ?? ""}`}
        visible={!!previewModel}
        onCancel={() => setPreviewModel(null)}
        footer={[
          <Button key="close" onClick={() => setPreviewModel(null)}>
            {t(`Close`)}
          </Button>,
        ]}
        width={800}
      >
        <pre
          style={{
            maxHeight: "60vh",
            overflow: "auto",
            backgroundColor: "#f5f5f5",
            padding: "16px",
            borderRadius: "4px",
            fontSize: "12px",
          }}
        >
          {previewModel?.content}
        </pre>
      </Modal>
    </>
  );
};

export default BackupRestoreFlow;
