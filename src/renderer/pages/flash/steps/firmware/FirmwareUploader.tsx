import React, { useEffect } from "react";
import { message } from "antd";
import { useMutation, gql, useQuery } from "@apollo/client";
import FirmwareUploadArea from "./FirmwareUploadArea";

type FirmwareUploaderProps = {
  onFileUploaded: (fileId?: string) => void;
  selectedFile?: string;
};

const FirmwareUploader: React.FC<FirmwareUploaderProps> = ({
  onFileUploaded,
  selectedFile,
}) => {
  const { data, loading } = useQuery(
    gql(/* GraphQL */ `
      query LocalFirmwareInfo($fileId: ID!) {
        localFirmware(byId: $fileId) {
          id
          name
        }
      }
    `),
    {
      variables: {
        fileId: selectedFile ?? "",
      },
      skip: !selectedFile,
    }
  );

  const [registerFirmware, { loading: uploading }] = useMutation(
    gql(/* GraphQL */ `
      mutation RegisterLocalFirmwareWithName($name: String!, $data: String!) {
        registerLocalFirmware(firmwareBase64Data: $data, fileName: $name) {
          id
          name
        }
      }
    `)
  );

  const firmwareInfo = data?.localFirmware;

  useEffect(() => {
    if (selectedFile && !loading && !firmwareInfo) {
      // Deselect the file
      onFileUploaded(undefined);
    }
  }, [selectedFile, loading, onFileUploaded, firmwareInfo]);

  return (
    <FirmwareUploadArea
      loading={loading || uploading}
      uploadedFile={firmwareInfo ?? undefined}
      onFileSelected={(file) => {
        if (file) {
          void registerFirmware({
            variables: {
              name: file.name,
              data: file.base64Data,
            },
          })
            .then((result) => {
              if (result.data) {
                onFileUploaded(result.data.registerLocalFirmware.id);
              }
            })
            .catch(() => {
              void message.error("Could not use firmware");
            });
        } else {
          onFileUploaded();
        }
      }}
    />
  );
};

export default FirmwareUploader;
