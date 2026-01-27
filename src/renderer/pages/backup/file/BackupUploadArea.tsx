import {
  InboxOutlined,
  LoadingOutlined,
  EyeOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import { Upload, Button, Card, List, Checkbox, Modal, Typography } from "antd";
import React, { useState, useEffect } from "react";
import styled from "styled-components";
import { useTranslation } from "react-i18next";
import {
  extractYamlFromZip,
  parseYamlFile,
  type ParsedYamlFile,
} from "shared/zipParser";

type BackupFile = {
  name: string;
  base64Data: string;
};

type ModelItem = {
  id: string;
  fileName: string;
  displayName: string;
  content: Record<string, unknown>;
  source: string; // 'zip', 'etx', or 'individual'
};

type Props = {
  onFileSelected: (file?: BackupFile) => void;
  onRestoreModels?: (models: ModelItem[]) => void;
  onPreviewModel?: (
    modelContent: Record<string, unknown>,
    modelName: string
  ) => void;
  onResetAfterRestore?: () => void;
  loading?: boolean;
  uploadedFile?: BackupFile;
  directorySelected?: boolean;
  restoring?: boolean;
};

const BackupUploadContainer = styled.div`
  height: 100%;
  > span {
    height: 100%;
  }
`;

const BackupUploadArea: React.FC<Props> = ({
  onFileSelected,
  onRestoreModels,
  onPreviewModel,
  onResetAfterRestore,
  loading,
  uploadedFile,
  directorySelected,
  restoring,
}) => {
  const [encoding, setEncoding] = useState(false);
  const { t } = useTranslation("backup");
  const [items, setItems] = useState<ModelItem[]>([]);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [lastProcessedFile, setLastProcessedFile] = useState<string>("");
  const wasRestoringRef = React.useRef(false);

  const loadingState = encoding || loading;

  useEffect(() => {
    if (uploadedFile) {
      // Avoid processing the same file twice
      const fileKey = `${uploadedFile.name}-${uploadedFile.base64Data.substring(
        0,
        100
      )}`;
      if (fileKey === lastProcessedFile) {
        return;
      }

      const processFile = async (): Promise<void> => {
        try {
          if (!uploadedFile.base64Data) {
            setEncoding(false);
            return;
          }

          const isZipOrEtx =
            uploadedFile.name.endsWith(".zip") ||
            uploadedFile.name.endsWith(".etx");

          if (isZipOrEtx) {
            // Process zip/etx file - extract models and add them individually
            const extractedItems = await extractYamlFromZip(
              uploadedFile.base64Data
            );

            // Create an array with fileName (object key), displayName (header.name), and content
            const modelList: ModelItem[] = Object.entries(extractedItems)
              .map(([fileName, data]: [string, Record<string, unknown>]) => ({
                id: `individual-${fileName}-${Date.now()}-${Math.random()}`,
                fileName,
                displayName:
                  ((data.header as Record<string, unknown> | undefined)
                    ?.name as string | undefined) ?? fileName,
                content: data,
                source: "individual",
              }))
              .filter((item) => item.fileName !== "labels"); // Exclude labels

            // Check for collisions with existing models and add new models
            const newModelIds: string[] = [];
            setItems((prevItems) => {
              const existingFileNames = new Set(
                prevItems.map((item) => item.fileName)
              );
              const newModels: ModelItem[] = [];
              const collisions: string[] = [];

              modelList.forEach((model) => {
                if (existingFileNames.has(model.fileName)) {
                  collisions.push(model.displayName);
                } else {
                  newModels.push(model);
                  newModelIds.push(model.id);
                }
              });

              // Show collision warning if any
              if (collisions.length > 0) {
                Modal.warning({
                  title: t("Model already exists in the list"),
                  content: `${t(
                    "The following models were skipped because they already exist"
                  )}: ${collisions.join(", ")}`,
                });
              }

              return [...prevItems, ...newModels];
            });

            // Add new model IDs to selection
            setSelectedModels((prevSelected) => [
              ...prevSelected,
              ...newModelIds,
            ]);
          } else if (
            uploadedFile.name.endsWith(".yml") ||
            uploadedFile.name.endsWith(".yaml")
          ) {
            // Process individual YAML file
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
            const parsed: ParsedYamlFile = parseYamlFile(
              uploadedFile.base64Data,
              uploadedFile.name
            );

            const newItem: ModelItem = {
              id: `individual-${uploadedFile.name}-${Date.now()}`,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              fileName: parsed.fileName,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              displayName:
                ((parsed.content.header as Record<string, unknown> | undefined)
                  ?.name as string | undefined) ?? parsed.fileName,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              content: parsed.content,
              source: "individual",
            };

            // Check for collision and add to existing items
            setItems((prevItems) => {
              const existingModel = prevItems.find(
                (item) => item.fileName === parsed.fileName
              );
              if (existingModel) {
                Modal.warning({
                  title: t("Model already exists in the list"),
                  content: `${existingModel.displayName}`,
                });
                return prevItems;
              }
              return [...prevItems, newItem];
            });

            setSelectedModels((prevSelected) => [...prevSelected, newItem.id]);
          }

          setLastProcessedFile(fileKey);
        } catch (error) {
          Modal.error({
            title: t("Error"),
            content: t("Error processing file"),
          });
        } finally {
          setEncoding(false);
        }
      };

      void processFile();
    }
  }, [uploadedFile, t, lastProcessedFile]);

  // Reset state after restore completes
  useEffect(() => {
    if (restoring) {
      wasRestoringRef.current = true;
    } else if (wasRestoringRef.current) {
      // Restore just finished
      wasRestoringRef.current = false;
      if (onResetAfterRestore) {
        onResetAfterRestore();
      }
      // Clear local state
      setItems([]);
      setSelectedModels([]);
      setLastProcessedFile("");
    }
  }, [restoring, onResetAfterRestore]);

  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      setSelectedModels(items.map((item) => item.id));
    } else {
      setSelectedModels([]);
    }
  };

  const handleModelToggle = (itemId: string, checked: boolean): void => {
    if (checked) {
      setSelectedModels([...selectedModels, itemId]);
    } else {
      setSelectedModels(selectedModels.filter((m) => m !== itemId));
    }
  };

  const handleRemoveModel = (itemId: string): void => {
    const newItems = items.filter((item) => item.id !== itemId);
    setItems(newItems);
    setSelectedModels(selectedModels.filter((m) => m !== itemId));

    // If all items removed, clear uploadedFile to allow new drag & drop
    if (newItems.length === 0) {
      setLastProcessedFile("");
      onFileSelected();
    }
  };

  const handleClearAll = (): void => {
    setItems([]);
    setSelectedModels([]);
    setLastProcessedFile("");
    onFileSelected();
  };

  return items.length === 0 ? (
    <BackupUploadContainer>
      <Upload.Dragger
        style={{
          padding: "48px 32px",
          height: "100%",
        }}
        showUploadList={false}
        multiple={false}
        disabled={loadingState}
        beforeUpload={async (file) => {
          // Accept .etx, .zip, and .yml files
          const isValidFormat =
            file.name.endsWith(".etx") ||
            file.name.endsWith(".zip") ||
            file.name.endsWith(".yml") ||
            file.name.endsWith(".yaml");
          if (!isValidFormat) {
            Modal.error({
              title: t("Error"),
              content: t("Please select a .etx, .zip or .yml file"),
            });
            return false;
          }

          const isLt100M = file.size / 1024 / 1024 < 100;
          if (!isLt100M) {
            Modal.error({
              title: t("Error"),
              content: t("File must be smaller than 100MB"),
            });
            return false;
          }

          setEncoding(true);
          try {
            onFileSelected({
              name: file.name,
              base64Data: Buffer.from(await file.arrayBuffer()).toString(
                "base64"
              ),
            });
          } finally {
            setEncoding(false);
          }
          return false;
        }}
        accept=".etx,.zip,.yml,.yaml"
      >
        <p className="ant-upload-drag-icon">
          {loadingState ? <LoadingOutlined /> : <InboxOutlined />}
        </p>

        <p className="ant-upload-text">
          {!loadingState
            ? t(`Click here to select files, or drag them here to upload.`)
            : t(`Verifying...`)}
        </p>
        <p className="ant-upload-hint">
          {t(
            `Supports .etx, .zip (full backup) or .yml (individual model) files`
          )}
        </p>
      </Upload.Dragger>
    </BackupUploadContainer>
  ) : (
    <div style={{ width: "100%", height: "100%" }}>
      <Card
        style={{ height: "100%", width: "100%" }}
        bodyStyle={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          <div style={{ marginBottom: "16px" }}>
            <Typography.Text strong>{t(`Selected models`)}</Typography.Text>
            <div>
              <Typography.Text type="secondary" style={{ fontSize: "12px" }}>
                {t(
                  `You can add more individual .yml files or load a full .etx/.zip backup`
                )}
              </Typography.Text>
            </div>
          </div>

          <div style={{ width: "100%", marginTop: "0" }}>
            <div
              style={{
                marginBottom: "8px",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <strong>{t(`Models to restore`)}:</strong>
              <Checkbox
                checked={
                  selectedModels.length === items.length && items.length > 0
                }
                indeterminate={
                  selectedModels.length > 0 &&
                  selectedModels.length < items.length
                }
                onChange={(e) => handleSelectAll(e.target.checked)}
              >
                {t(`Select all`)}
              </Checkbox>
            </div>

            <List
              bordered
              style={{ maxHeight: "300px", overflowY: "auto" }}
              dataSource={items}
              renderItem={(item) => (
                <List.Item
                  actions={[
                    ...(onPreviewModel
                      ? [
                          <Button
                            key="preview"
                            type="link"
                            icon={<EyeOutlined />}
                            onClick={() =>
                              onPreviewModel(item.content, item.displayName)
                            }
                          >
                            {t(`Preview`)}
                          </Button>,
                        ]
                      : []),
                    ...(item.source === "individual"
                      ? [
                          <Button
                            key="remove"
                            type="link"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveModel(item.id)}
                          >
                            {t(`Remove`)}
                          </Button>,
                        ]
                      : []),
                  ]}
                >
                  <Checkbox
                    checked={selectedModels.includes(item.id)}
                    onChange={(e) =>
                      handleModelToggle(item.id, e.target.checked)
                    }
                  >
                    <span>{item.displayName}</span>
                  </Checkbox>
                </List.Item>
              )}
            />
          </div>

          <div
            style={{
              marginTop: "16px",
              display: "flex",
              gap: "8px",
              width: "100%",
              flexWrap: "wrap",
            }}
          >
            <Upload
              showUploadList={false}
              multiple={false}
              disabled={loadingState ?? restoring}
              beforeUpload={async (file) => {
                const isValidFormat =
                  file.name.endsWith(".etx") ||
                  file.name.endsWith(".zip") ||
                  file.name.endsWith(".yml");
                if (!isValidFormat) {
                  Modal.error({
                    title: t("Error"),
                    content: t("Please select a .etx, .zip or .yml file"),
                  });
                  return false;
                }

                const isLt100M = file.size / 1024 / 1024 < 100;
                if (!isLt100M) {
                  Modal.error({
                    title: t("Error"),
                    content: t("File must be smaller than 100MB"),
                  });
                  return false;
                }

                setEncoding(true);
                try {
                  onFileSelected({
                    name: file.name,
                    base64Data: Buffer.from(await file.arrayBuffer()).toString(
                      "base64"
                    ),
                  });
                } finally {
                  setEncoding(false);
                }
                return false;
              }}
              accept=".etx,.zip,.yml"
            >
              <Button type="dashed" disabled={restoring} loading={loadingState}>
                {t(`Add more files`)}
              </Button>
            </Upload>

            <Button
              type="default"
              onClick={handleClearAll}
              disabled={restoring}
            >
              {t(`Clear all`)}
            </Button>

            {directorySelected && onRestoreModels && (
              <Button
                type="primary"
                onClick={() => {
                  const selectedItems = items.filter((item) =>
                    selectedModels.includes(item.id)
                  );
                  onRestoreModels(selectedItems);
                }}
                disabled={selectedModels.length === 0 || restoring}
                loading={restoring}
                style={{ flex: 1 }}
              >
                {t(`Restore models`)} ({selectedModels.length})
              </Button>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
};

export default BackupUploadArea;
