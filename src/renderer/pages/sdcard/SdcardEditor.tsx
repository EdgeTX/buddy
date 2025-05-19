import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useQuery } from "@apollo/client";
import { Modal, Tabs, Button, Spin, Alert, Space } from "antd";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import useMedia from "use-media";
import styled from "styled-components";
import {
  FullSdcardInfoQuery,
  FullSdcardInfoQueryVariables,
} from "renderer/__generated__/tag/graphql";
import { FULL_SDCARD_INFO } from "./editor/sdcard.gql";
import AssetsTab from "./editor/tabs/AssetsTab";
import ModelsListTab from "./editor/tabs/ModelsListTab";
import ThemesListTab from "./editor/tabs/ThemesListTab";
import RadioListTab from "./editor/tabs/RadioSettingsTab";
import BackupTab from "./editor/tabs/BackupTab";
import RestoreTab from "./editor/tabs/RestoreTab";

const Shell = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const FullHeightTabs = styled(Tabs)`
  flex: 1;
  display: flex;
  .ant-tabs-content-holder {
    flex: 1;
    overflow-y: auto;
  }
`;

const PaneContent = styled.div`
  height: 100%;
  padding: 16px;
  box-sizing: border-box;
  overflow-y: auto;
`;

const { TabPane } = Tabs;

type AssetType = "MODELS" | "THEMES" | "RADIO";

const SdcardEditor: React.FC = () => {
  const [backupAsset, setBackupAsset] = useState<AssetType | null>(null);
  const [restoreAsset, setRestoreAsset] = useState<AssetType | null>(null);

  const { directoryId, tab } = useParams() as {
    directoryId: string;
    tab: string;
  };
  const navigate = useNavigate();
  const isWide = useMedia({ minWidth: "1200px" });

  const { data, loading, error } = useQuery<
    FullSdcardInfoQuery,
    FullSdcardInfoQueryVariables
  >(FULL_SDCARD_INFO, {
    variables: { directoryId },
    skip: !directoryId,
    fetchPolicy: "cache-and-network",
  });

  const directory = data?.sdcardDirectory;
  const assets = data?.sdcardAssetsDirectory;
  const baseAssetsUnknown =
    !loading && !error && (!directory?.pack.target || !directory.pack.version);

  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const toggleModel = (name: string, checked: boolean): void => {
    setSelectedModels((prev) =>
      checked ? [...prev, name] : prev.filter((m) => m !== name)
    );
  };

  const [selectedThemes, setSelectedThemes] = useState<string[]>([]);
  const toggleTheme = (name: string, checked: boolean): void => {
    setSelectedThemes((prev) =>
      checked ? [...prev, name] : prev.filter((n) => n !== name)
    );
  };

  const [selectedRadio, setSelectedRadio] = useState<string[]>([]);
  const toggleRadio = (name: string, checked: boolean): void => {
    setSelectedRadio((prev) =>
      checked ? [...prev, name] : prev.filter((n) => n !== name)
    );
  };

  // redirect if invalid or missing
  useEffect(() => {
    if (!directoryId || (!loading && (!directory || error))) {
      navigate("/sdcard", { replace: true });
      return;
    }
    if (directoryId && !tab) {
      navigate(`/sdcard/${directoryId}/assets`, { replace: true });
    }
  }, [directoryId, navigate, directory, error, loading, tab]);

  // confirm invalid SD-card handle
  useEffect(() => {
    let confirmDialog: ReturnType<typeof Modal.confirm> | null = null;
    if (directory && !loading && !directory.isValid) {
      confirmDialog = Modal.confirm({
        title: "Are you sure this is the SD Card?",
        icon: <ExclamationCircleOutlined />,
        content:
          "The selected directory might not be the SD card. If your SD Card is empty, please continue, otherwise go back and make sure you select the root of the SD Card",
        okText: "Continue",
        cancelText: "Go back",
        okType: "danger",
        onCancel: () => navigate("/sdcard"),
      });
    }
    return () => confirmDialog?.destroy();
  }, [directory, loading, navigate]);

  if (!directoryId) return null;
  if (loading) return <Spin style={{ margin: 40 }} />;
  if (error) return <Alert type="error" message={error.message} />;

  // map AssetType to selected list
  const selectedMap: Record<AssetType, string[]> = {
    MODELS: selectedModels,
    THEMES: selectedThemes,
    RADIO: selectedRadio,
  };

  return (
    <Shell>
      {backupAsset && (
        <Modal
          visible
          width="70%"
          footer={null}
          onCancel={() => setBackupAsset(null)}
        >
          <BackupTab
            directoryId={directoryId}
            assetType={backupAsset}
            selected={selectedMap[backupAsset]}
          />
        </Modal>
      )}

      {restoreAsset && (
        <Modal
          visible
          width="70%"
          footer={null}
          onCancel={() => setRestoreAsset(null)}
        >
          <RestoreTab
            directoryId={directoryId}
            assetType={restoreAsset}
            selected={selectedMap[restoreAsset]}
          />
        </Modal>
      )}

      <FullHeightTabs
        activeKey={tab}
        type="card"
        size="large"
        tabPosition={isWide ? "left" : "top"}
        onTabClick={(key) =>
          key !== tab && navigate(`/sdcard/${directoryId}/${key}`)
        }
        destroyInactiveTabPane
        tabBarStyle={isWide ? { width: "120px" } : undefined}
      >
        <TabPane tab="Assets" key="assets" disabled={baseAssetsUnknown}>
          <PaneContent>
            <AssetsTab directoryId={directoryId} />
          </PaneContent>
        </TabPane>

        <TabPane tab="Models" key="models" disabled={baseAssetsUnknown}>
          <PaneContent>
            <ModelsListTab
              models={assets?.models ?? []}
              selected={selectedModels}
              onToggle={toggleModel}
            />
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                disabled={selectedModels.length === 0}
                onClick={() => setBackupAsset("MODELS")}
              >
                Backup Selected Models
              </Button>
              <Button onClick={() => setRestoreAsset("MODELS")}>
                Restore Models
              </Button>
            </Space>
          </PaneContent>
        </TabPane>

        <TabPane tab="Themes" key="themes" disabled={baseAssetsUnknown}>
          <PaneContent>
            <ThemesListTab
              themes={assets?.themes ?? []}
              selected={selectedThemes}
              onToggle={toggleTheme}
            />
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                disabled={selectedThemes.length === 0}
                onClick={() => setBackupAsset("THEMES")}
              >
                Backup Selected Themes
              </Button>
              <Button onClick={() => setRestoreAsset("THEMES")}>
                Restore Themes
              </Button>
            </Space>
          </PaneContent>
        </TabPane>

        <TabPane tab="Radio" key="radio" disabled={baseAssetsUnknown}>
          <PaneContent>
            <RadioListTab
              radio={assets?.radio ?? []}
              selected={selectedRadio}
              onToggle={toggleRadio}
            />
            <Space style={{ marginTop: 16 }}>
              <Button
                type="primary"
                disabled={selectedRadio.length === 0}
                onClick={() => setBackupAsset("RADIO")}
              >
                Backup Selected Radio
              </Button>
              <Button onClick={() => setRestoreAsset("RADIO")}>
                Restore Radio
              </Button>
            </Space>
          </PaneContent>
        </TabPane>
      </FullHeightTabs>
    </Shell>
  );
};

export default SdcardEditor;

// // renderer/pages/sdcard/SdcardEditor.tsx
// import { ExclamationCircleOutlined } from '@ant-design/icons'
// import { useQuery } from '@apollo/client'
// import { Modal, Tabs, Button, Spin, Alert } from 'antd'
// import React, { useEffect, useState } from 'react'
// import { useNavigate, useParams } from 'react-router-dom'
// import useMedia from 'use-media'
// import styled from 'styled-components'
// import { FULL_SDCARD_INFO } from './editor/sdcard.gql'
// import AssetsTab from './editor/tabs/AssetsTab'
// import ModelsListTab from './editor/tabs/ModelsListTab'
// import ThemesListTab from './editor/tabs/ThemesListTab'
// import RadioListTab from './editor/tabs/RadioSettingsTab'
// import BackupTab from './editor/tabs/BackupTab'
// import RestoreTab from './editor/tabs/RestoreTab'

// const Shell = styled.div`
//   height: 100%;
//   display: flex;
//   flex-direction: column;
//   overflow: hidden;
// `

// const FullHeightTabs = styled(Tabs)`
//   flex: 1;
//   display: flex;
//   .ant-tabs-content-holder {
//     flex: 1;
//     overflow-y: auto;
//   }
// `

// const PaneContent = styled.div`
//   height: 100%;
//   padding: 16px;
//   box-sizing: border-box;
//   overflow-y: auto;
// `

// const { TabPane } = Tabs

// const SdcardEditor: React.FC = () => {
//   const { directoryId, tab } = useParams<{ directoryId: string; tab: string }>()
//   const navigate = useNavigate()
//   const isWide = useMedia({ minWidth: '1200px' })

//   const { data, loading, error } = useQuery(FULL_SDCARD_INFO, {
//     variables: { directoryId: directoryId ?? '' },
//     skip: !directoryId,
//     fetchPolicy: 'cache-and-network',
//   })

//   const directory = data?.sdcardDirectory
//   const assets = data?.sdcardAssetsDirectory
//   const baseAssetsUnknown =
//     !loading && !error && (!directory?.pack.target || !directory.pack.version)

//   const [selectedModels, setSelectedModels] = useState<string[]>([])
//   const toggleModel = (name: string, checked: boolean) => {
//     setSelectedModels((prev) =>
//       checked ? [...prev, name] : prev.filter((m) => m !== name)
//     )
//   }

//   useEffect(() => {
//     if (!directoryId || (!loading && (!directory || error))) {
//       navigate('/sdcard', { replace: true })
//     } else if (directoryId && !tab) {
//       navigate(`/sdcard/${directoryId}/assets`, { replace: true })
//     }
//   }, [directoryId, navigate, directory, error, loading, tab])

//   useEffect(() => {
//     if (directory && !loading && !directory.isValid) {
//       const confirmDialog = Modal.confirm({
//         title: 'Are you sure this is the SD Card?',
//         icon: <ExclamationCircleOutlined />,
//         content:
//           'The selected directory might not be the SD card. If your SD Card is empty, please continue, otherwise go back and make sure you select the root of the SD Card',
//         okText: 'Continue',
//         cancelText: 'Go back',
//         okType: 'danger',
//         onCancel: () => {
//           navigate('/sdcard')
//         },
//       })
//       return () => confirmDialog.destroy()
//     }
//   }, [directory, loading, navigate])

//   if (!directoryId) return null
//   if (loading) return <Spin style={{ margin: 40 }} />
//   if (error) return <Alert type="error" message={error.message} />

//   return (
//     <Shell>
//       <FullHeightTabs
//         activeKey={tab}
//         type="card"
//         size="large"
//         tabPosition={isWide ? 'left' : 'top'}
//         onTabClick={(key) =>
//           key !== tab && navigate(`/sdcard/${directoryId}/${key}`)
//         }
//         destroyInactiveTabPane
//         tabBarStyle={isWide ? { width: '120px' } : undefined}
//       >
//         <TabPane tab="Assets" key="assets" disabled={baseAssetsUnknown}>
//           <PaneContent>
//             <AssetsTab directoryId={directoryId} />
//           </PaneContent>
//         </TabPane>

//         <TabPane tab="Models" key="models" disabled={baseAssetsUnknown}>
//           <PaneContent>
//             <ModelsListTab
//               models={assets?.models ?? []}
//               selected={selectedModels}
//               onToggle={toggleModel}
//             />
//             <Button
//               type="primary"
//               disabled={selectedModels.length === 0}
//               style={{ marginTop: 16 }}
//               onClick={() => navigate(`/sdcard/${directoryId}/backup`)}
//             >
//               Backup Selected Models
//             </Button>
//           </PaneContent>
//         </TabPane>

//         <TabPane tab="Backup" key="backup" disabled={baseAssetsUnknown}>
//           <PaneContent>
//             <BackupTab
//               directoryId={directoryId}
//               selectedModels={selectedModels}
//             />
//           </PaneContent>
//         </TabPane>

//         <TabPane tab="Restore" key="restore" disabled={baseAssetsUnknown}>
//           <PaneContent>
//             <RestoreTab directoryId={directoryId} />
//           </PaneContent>
//         </TabPane>

//         <TabPane tab="Themes" key="themes" disabled={baseAssetsUnknown}>
//           <PaneContent>
//             <ThemesListTab themes={assets?.themes ?? []} />
//           </PaneContent>
//         </TabPane>

//         <TabPane tab="Radio" key="radio" disabled={baseAssetsUnknown}>
//           <PaneContent>
//             <RadioListTab radio={assets?.radio ?? []} />
//           </PaneContent>
//         </TabPane>
//       </FullHeightTabs>
//     </Shell>
//   )
// }

// export default SdcardEditor
