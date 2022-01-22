import { ExclamationCircleOutlined } from "@ant-design/icons";
import { gql, useQuery } from "@apollo/client";
import { Modal, Tabs } from "antd";
import React, { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useMedia from "use-media";

import AssetsTab from "./editor/AssetsTab";

const SdcardEditor: React.FC = () => {
  const { directoryId, tab } = useParams();
  const navigate = useNavigate();
  const isWide = useMedia({ minWidth: "1200px" });

  const { data, loading, error } = useQuery(
    gql(/* GraphQL */ `
      query SdcardInfo($directoryId: ID!) {
        sdcardDirectory(id: $directoryId) {
          id
          isValid
          pack {
            target
            version
          }
        }
      }
    `),
    {
      variables: {
        directoryId: directoryId ?? "",
      },
      skip: !directoryId,
      fetchPolicy: "cache-and-network",
    }
  );

  const directory = data?.sdcardDirectory;
  const baseAssetsUnknown =
    !loading &&
    !error &&
    (!data?.sdcardDirectory?.pack.target || !data.sdcardDirectory.pack.version);

  useEffect(() => {
    if (!directoryId || (!loading && (!directory || error))) {
      navigate("/sdcard", { replace: true });
    } else if (directoryId && !tab) {
      navigate(`/sdcard/${directoryId}/assets`, { replace: true });
    }
  }, [directoryId, navigate, directory, error, loading, tab]);

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
    <Tabs
      activeKey={tab}
      size="large"
      type="card"
      tabPosition={isWide ? "left" : "top"}
      onTabClick={(newTab) => {
        if (newTab !== tab) {
          navigate(`/sdcard/${directoryId}/${newTab}`);
        }
      }}
      destroyInactiveTabPane
      tabBarStyle={
        isWide
          ? {
              width: "100px",
            }
          : undefined
      }
    >
      <Tabs.TabPane
        tab={
          <span style={{ width: "60px" }}>
            {baseAssetsUnknown && (
              <ExclamationCircleOutlined
                style={{ color: "var(--ant-error-color)" }}
              />
            )}
            Assets
          </span>
        }
        key="assets"
      >
        <AssetsTab directoryId={directoryId} />
      </Tabs.TabPane>
      <Tabs.TabPane
        tab="Themes"
        key="themes"
        disabled={baseAssetsUnknown || true}
      >
        <div>Theme tabs</div>
      </Tabs.TabPane>
    </Tabs>
  );
};

export default SdcardEditor;
