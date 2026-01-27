import {
  FolderOpenTwoTone,
  DownloadOutlined,
  CheckCircleOutlined,
} from "@ant-design/icons";
import {
  Button,
  Tooltip,
  message,
  Card,
  List,
  Checkbox,
  Typography,
  Progress,
  Radio,
  Space,
} from "antd";
import React, { useState } from "react";
import { useMutation, gql, useQuery } from "@apollo/client";
import environment from "shared/environment";
import checks from "renderer/compatibility/checks";
import { useTranslation } from "react-i18next";

const notAvailable = !environment.isElectron && !checks.hasFilesystemApi;

type ModelInfo = {
  fileName: string;
  displayName: string;
};

const BackupCreateFlow: React.FC = () => {
  const { t } = useTranslation("backup");

  const [directory, setDirectory] = useState<string | null>(null);
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [downloadFormat, setDownloadFormat] = useState<
    "etx" | "zip" | "individual"
  >("etx");
  const [includeLabels, setIncludeLabels] = useState(false);

  const [selectDirectory] = useMutation(
    gql(/* GraphQL */ `
      mutation PickSdcardDirectory {
        pickSdcardDirectory {
          id
        }
      }
    `)
  );

  const [createBackup] = useMutation(
    gql(/* GraphQL */ `
      mutation CreateBackupFromSdcard(
        $directoryId: ID!
        $selectedModels: [String!]
        $fileName: String
        $includeLabels: Boolean
      ) {
        createBackupFromSdcard(
          directoryId: $directoryId
          selectedModels: $selectedModels
          fileName: $fileName
          includeLabels: $includeLabels
        ) {
          id
          name
          base64Data
        }
      }
    `)
  );

  const [downloadIndividualModels] = useMutation(
    gql(/* GraphQL */ `
      mutation DownloadIndividualModels(
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
          base64Data
        }
      }
    `)
  );

  const { data: directoryInfo } = useQuery(
    gql(/* GraphQL */ `
      query SdcardDirectoryInfo($directoryId: ID!) {
        sdcardModelsDirectory(id: $directoryId) {
          id
          name
          isValid
          hasLabels
          pack {
            target
            version
          }
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

  const { data: modelsData } = useQuery(
    gql(/* GraphQL */ `
      query SdcardModelsWithNames($directoryId: ID!) {
        sdcardModelsWithNames(directoryId: $directoryId) {
          fileName
          displayName
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

  const directoryData = directoryInfo?.sdcardModelsDirectory;
  const availableModels: ModelInfo[] = (modelsData?.sdcardModelsWithNames ??
    []) as ModelInfo[];

  const handleSelectDirectory = (): void => {
    void selectDirectory().then((result) => {
      if (result.data?.pickSdcardDirectory) {
        const pickedDirectoryData = result.data.pickSdcardDirectory;
        setDirectory(pickedDirectoryData.id);
        void message.success(t(`SD Card selected successfully`));
      }
    });
  };

  const handleSelectAll = (checked: boolean): void => {
    if (checked) {
      setSelectedModels(availableModels.map((m: ModelInfo) => m.fileName));
    } else {
      setSelectedModels([]);
    }
  };

  const handleModelToggle = (fileName: string, checked: boolean): void => {
    if (checked) {
      setSelectedModels([...selectedModels, fileName]);
    } else {
      setSelectedModels(selectedModels.filter((m) => m !== fileName));
    }
  };

  const handleCreateBackup = (): void => {
    if (!directory) {
      void message.error(t(`Please select SD Card first`));
      return;
    }

    if (selectedModels.length === 0) {
      void message.error(t(`Please select at least one model`));
      return;
    }

    setCreating(true);
    setProgress(0);

    const isoString = new Date().toISOString();
    const timestamp: string = isoString.replace(/[:.]/g, "-").split("T")[0];

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

    if (downloadFormat === "individual") {
      // Download individual files
      void downloadIndividualModels({
        variables: {
          directoryId: directory,
          selectedModels,
          includeLabels,
        },
      })
        .then((result) => {
          clearInterval(interval);
          setProgress(100);

          if (result.data?.downloadIndividualModels) {
            const files = result.data.downloadIndividualModels as {
              fileName: string;
              base64Data: string;
            }[];

            // Download each file
            files.forEach((file: { fileName: string; base64Data: string }) => {
              const blob = new Blob([Buffer.from(file.base64Data, "base64")], {
                type: "application/octet-stream",
              });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = file.fileName;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              URL.revokeObjectURL(url);
            });

            void message.success(
              t(`{{count}} files downloaded`, { count: files.length })
            );

            setTimeout(() => {
              setCreating(false);
              setProgress(0);
              setSelectedModels([]);
            }, 1000);
          }
        })
        .catch((e: Error) => {
          clearInterval(interval);
          void message.error(`${t(`Error creating backup`)}: ${e.message}`);
          setCreating(false);
          setProgress(0);
        });
    } else {
      // Download as .etx or .zip
      const extension = downloadFormat === "etx" ? "etx" : "zip";
      const fileName = `backup-${timestamp}.${extension}`;

      void createBackup({
        variables: {
          directoryId: directory,
          selectedModels,
          fileName,
          includeLabels,
        },
      })
        .then((result) => {
          clearInterval(interval);
          setProgress(100);

          if (result.data?.createBackupFromSdcard) {
            const { base64Data, name } = result.data.createBackupFromSdcard;

            // Download the file
            const blob = new Blob([Buffer.from(base64Data, "base64")], {
              type: "application/octet-stream",
            });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = name;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

            void message.success(t(`Backup created successfully`));

            setTimeout(() => {
              setCreating(false);
              setProgress(0);
              setSelectedModels([]);
            }, 1000);
          }
        })
        .catch((e: Error) => {
          clearInterval(interval);
          void message.error(`${t(`Error creating backup`)}: ${e.message}`);
          setCreating(false);
          setProgress(0);
        });
    }
  };

  const sdCardSelectionArea = (
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
                  {t(`Select your SD Card to create a backup`)}
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
                disabled={notAvailable || creating}
                onClick={handleSelectDirectory}
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
                  {availableModels.length > 0
                    ? `${availableModels.length} ${t(`models available`)}`
                    : t(`No models found`)}
                </Typography.Text>
              </div>
            </div>
            <Button
              size="small"
              disabled={creating}
              onClick={handleSelectDirectory}
            >
              {t(`Change`)}
            </Button>
          </>
        )}
      </div>
    </Card>
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        width: "100%",
        padding: "8px 0",
      }}
    >
      {sdCardSelectionArea}

      {directory && availableModels.length > 0 && (
        <Card style={{ width: "100%" }} title={t(`Select models to backup`)}>
          <div style={{ marginBottom: "16px" }}>
            <Checkbox
              checked={
                selectedModels.length === availableModels.length &&
                availableModels.length > 0
              }
              indeterminate={
                selectedModels.length > 0 &&
                selectedModels.length < availableModels.length
              }
              onChange={(e) => handleSelectAll(e.target.checked)}
            >
              {t(`Select all`)}
            </Checkbox>
          </div>

          <List
            bordered
            style={{ maxHeight: "300px", overflowY: "auto" }}
            dataSource={availableModels}
            renderItem={(model: ModelInfo) => (
              <List.Item>
                <Checkbox
                  checked={selectedModels.includes(model.fileName)}
                  onChange={(e) =>
                    handleModelToggle(model.fileName, e.target.checked)
                  }
                >
                  {model.displayName}
                </Checkbox>
              </List.Item>
            )}
          />

          <div style={{ marginTop: "16px" }}>
            <Typography.Text strong>{t(`Export format`)}</Typography.Text>
            <Radio.Group
              value={downloadFormat}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const value = e.target.value as "etx" | "zip" | "individual";
                setDownloadFormat(value);
              }}
              style={{ display: "block", marginTop: "8px" }}
            >
              <Space direction="vertical">
                <Radio value="etx">
                  {t(`Single .etx file (EdgeTX backup)`)}
                </Radio>
                <Radio value="zip">{t(`Single .zip file`)}</Radio>
                <Radio value="individual">{t(`Individual .yml files`)}</Radio>
              </Space>
            </Radio.Group>
          </div>

          {(directoryData as { hasLabels?: boolean }).hasLabels && (
            <div style={{ marginTop: "16px" }}>
              <Checkbox
                checked={includeLabels}
                onChange={(e) => setIncludeLabels(e.target.checked)}
              >
                {t(`Include labels.yml file`)}
              </Checkbox>
            </div>
          )}

          <div style={{ marginTop: "16px" }}>
            <Button
              type="primary"
              icon={<DownloadOutlined />}
              onClick={handleCreateBackup}
              disabled={selectedModels.length === 0 || creating}
              loading={creating}
              block
            >
              {t(`Create backup`)} ({selectedModels.length} {t(`models`)})
            </Button>
          </div>

          {creating && (
            <div style={{ marginTop: "16px" }}>
              <Typography.Text>{t(`Creating backup...`)}</Typography.Text>
              <Progress percent={progress} status="active" />
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default BackupCreateFlow;
