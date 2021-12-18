import { ExclamationCircleOutlined } from "@ant-design/icons";
import { gql, useQuery } from "@apollo/client";
import { Modal, Tabs } from "antd";
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import AssetsTab from "./editor/AssetsTab";

const SdcardEditor: React.FC = () => {
  const { directoryId } = useParams();
  const navigate = useNavigate();

  const { data, loading, error } = useQuery(
    gql(/* GraphQL */ `
      query SdcardInfo($directoryId: ID!) {
        sdcardDirectory(id: $directoryId) {
          id
          isValid
          version
          target
        }
      }
    `),
    {
      variables: {
        directoryId: directoryId ?? "",
      },
      skip: !directoryId,
    }
  );

  const directory = data?.sdcardDirectory;

  useEffect(() => {
    if (!directoryId || (!loading && (!directory || error))) {
      navigate("/sdcard");
    }
  }, [directoryId, navigate, directory, error, loading]);

  useEffect(() => {
    if (directory && !loading && !directory.isValid) {
      const confirmDialog = Modal.confirm({
        title: "Are you sure this is the SD Card?",
        icon: <ExclamationCircleOutlined />,
        content:
          "The selected directory might not be the SD card. If your SD Card is empty, please continue, otherwise go back and make sure you select the root of the SD Card",
        okText: "Continue",
        cancelText: "Go back",
        okType: "danger",
        onCancel: () => {
          navigate("/sdcard");
        },
      });

      return () => {
        confirmDialog.destroy();
      };
    }
    return undefined;
  }, [directory, loading, navigate]);

  if (!directoryId) {
    return null;
  }

  return (
    <Tabs defaultActiveKey="1" size="large" type="card">
      <Tabs.TabPane tab="Assets" key="1">
        <AssetsTab directoryId={directoryId} />
      </Tabs.TabPane>
    </Tabs>
  );
};

export default SdcardEditor;
