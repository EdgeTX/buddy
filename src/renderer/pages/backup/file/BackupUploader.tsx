import React, { useEffect } from "react";
import { message } from "antd";
import { useMutation, gql, useQuery } from "@apollo/client";
import { exception } from "react-ga";
import { useTranslation } from "react-i18next";
import BackupUploadArea from "./BackupUploadArea";

type ModelItem = {
  id: string;
  fileName: string;
  displayName: string;
  content: Record<string, unknown>;
  source: string;
};

type BackupUploaderProps = {
  onFileUploaded: (fileId?: string) => void;
  onRestoreModels?: (models: ModelItem[]) => void;
  onPreviewModel?: (
    modelContent: Record<string, unknown>,
    modelName: string
  ) => void;
  onResetAfterRestore?: () => void;
  selectedFile?: string;
  directorySelected?: boolean;
  restoring?: boolean;
};

const BackupUploader: React.FC<BackupUploaderProps> = ({
  onFileUploaded,
  onRestoreModels,
  onPreviewModel,
  onResetAfterRestore,
  selectedFile,
  directorySelected,
  restoring,
}) => {
  const { t } = useTranslation("backup");
  const { data, loading } = useQuery(
    gql(/* GraphQL */ `
      query LocalBackupInfo($fileId: ID!) {
        localBackup(byId: $fileId) {
          id
          name
          base64Data
        }
      }
    `),
    {
      variables: {
        fileId: selectedFile ?? "",
      },
      fetchPolicy: "network-only",
      skip: !selectedFile,
    }
  );

  const [registerBackup, { loading: uploading }] = useMutation(
    gql(/* GraphQL */ `
      mutation RegisterLocalBackupWithName($name: String!, $data: String!) {
        registerLocalBackup(backupBase64Data: $data, fileName: $name) {
          id
          name
        }
      }
    `)
  );

  const backupInfo = data?.localBackup;

  useEffect(() => {
    if (selectedFile && !loading && !backupInfo) {
      // Deselect the file
      onFileUploaded(undefined);
    }
  }, [selectedFile, loading, onFileUploaded, backupInfo]);

  return (
    <BackupUploadArea
      loading={loading || uploading}
      uploadedFile={backupInfo ?? undefined}
      directorySelected={directorySelected}
      restoring={restoring}
      onResetAfterRestore={onResetAfterRestore}
      onFileSelected={(file) => {
        if (file) {
          void registerBackup({
            variables: {
              name: file.name,
              data: file.base64Data,
            },
          })
            .then((result) => {
              if (result.data) {
                onFileUploaded(result.data.registerLocalBackup.id);
              }
            })
            .catch((e: Error) => {
              exception({
                description: `Error uploading local backup: ${e.message}`,
                fatal: true,
              });
              void message.error(t(`Could not use backup file`));
            });
        } else {
          onFileUploaded();
        }
      }}
      onRestoreModels={onRestoreModels}
      onPreviewModel={onPreviewModel}
    />
  );
};

export default BackupUploader;
