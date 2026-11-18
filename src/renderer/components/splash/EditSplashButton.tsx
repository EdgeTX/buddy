import React, { useState } from "react";
import { Button, Modal, message } from "antd";
import { PictureOutlined } from "@ant-design/icons";
import { gql, useQuery } from "@apollo/client";
import { useTranslation } from "react-i18next";
import { SelectedFlags } from "shared/backend/types";
import useCloudbuildFirmwareBytes from "renderer/hooks/useCloudbuildFirmwareBytes";
import useFetchFirmwareData from "renderer/hooks/useFetchFirmwareData";
import useRegisterLocalFirmware from "renderer/hooks/useRegisterLocalFirmware";
import { DownloadFirmwareTimeline } from "renderer/components/firmware/DownloadFirmwareTimeline";
import SplashEditorDialog from "./SplashEditorDialog";

type Props = {
  /** Which Firmware Selection tab is active. */
  activeTab: string;
  version?: string;
  target?: string;
  /** Only relevant for the "cloudbuild" tab. */
  selectedFlags?: SelectedFlags;
  onApplied: (patchedFirmwareId: string) => void;
};

const EditSplashButton: React.FC<Props> = ({
  activeTab,
  version,
  target,
  selectedFlags,
  onApplied,
}) => {
  const { t } = useTranslation("flashing");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [buildModalOpen, setBuildModalOpen] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [registeredFirmwareId, setRegisteredFirmwareId] = useState<string>();
  const isLocal = activeTab === "file";
  const isCloudbuild = activeTab === "cloudbuild";

  const {
    state: buildState,
    start: startBuild,
    reset: resetBuild,
  } = useCloudbuildFirmwareBytes();
  const { fetchFirmwareData } = useFetchFirmwareData();
  const { registerLocalFirmware } = useRegisterLocalFirmware();

  // Target codes are the same for the Cloud and CloudBuild tabs, so a
  // single static lookup covers both; only the Local file tab needs the
  // byte-scanning firmwareSplashInfo query instead. This is only used to
  // gate whether the button is shown at all, before any firmware bytes
  // have been fetched - the dialog itself re-derives capability from real
  // bytes once it has a registered firmware id.
  const { data: byTargetData } = useQuery(
    gql(/* GraphQL */ `
      query SplashCapabilityByTarget($targetCode: String!) {
        splashCapability(targetCode: $targetCode) {
          format
          width
          height
          maxBytes
        }
      }
    `),
    {
      variables: { targetCode: target ?? "" },
      skip: isLocal || !target,
    }
  );

  const { data: byFirmwareData } = useQuery(
    gql(/* GraphQL */ `
      query SplashCapabilityByFirmware($firmwareId: ID!) {
        firmwareSplashInfo(firmwareId: $firmwareId) {
          format
          width
          height
          maxBytes
        }
      }
    `),
    {
      variables: { firmwareId: target ?? "" },
      skip: !isLocal || !target,
    }
  );

  if (
    activeTab !== "releases" &&
    activeTab !== "file" &&
    activeTab !== "cloudbuild"
  ) {
    return null;
  }

  const capability = isLocal
    ? byFirmwareData?.firmwareSplashInfo
    : byTargetData?.splashCapability;

  if (!target || !capability) {
    return null;
  }

  const closeBuildModal = (): void => {
    resetBuild();
    setBuildModalOpen(false);
  };

  const handleClick = (): void => {
    if (isLocal) {
      setDialogOpen(true);
      return;
    }

    if (!version || !target) {
      return;
    }

    if (isCloudbuild) {
      const flags = (selectedFlags ?? []) as { name: string; value: string }[];
      setBuildModalOpen(true);
      startBuild({ release: version, target, flags }, (data) => {
        void registerLocalFirmware(
          `${target}-${version}.bin`,
          Buffer.from(data).toString("base64")
        )
          .then((id) => {
            setBuildModalOpen(false);
            if (id) {
              setRegisteredFirmwareId(id);
              setDialogOpen(true);
            } else {
              void message.error(t(`Could not register firmware`));
            }
          })
          .catch(() => {
            setBuildModalOpen(false);
            void message.error(t(`Could not register firmware`));
          });
      });
      return;
    }

    // "releases" (GitHub) tab: eagerly fetch and register the real
    // firmware bytes before opening the dialog, mirroring the CloudBuild
    // flow above, so the dialog always operates on a real, already
    // registered firmware id - same as the other two tabs.
    setFetching(true);
    fetchFirmwareData(version, target)
      .then((data) => {
        if (!data) {
          throw new Error(t(`Could not fetch firmware`));
        }
        return registerLocalFirmware(
          `${target}-${version}.bin`,
          Buffer.from(data).toString("base64")
        );
      })
      .then((id) => {
        setFetching(false);
        if (id) {
          setRegisteredFirmwareId(id);
          setDialogOpen(true);
        } else {
          void message.error(t(`Could not register firmware`));
        }
      })
      .catch(() => {
        setFetching(false);
        void message.error(t(`Could not register firmware`));
      });
  };

  const dialogTarget = isLocal ? target : registeredFirmwareId;

  return (
    <>
      <Button
        icon={<PictureOutlined />}
        loading={fetching}
        onClick={handleClick}
      >
        {t(`Edit splash screen`)}
      </Button>
      {buildModalOpen && (
        <Modal
          title={t(`Cloudbuild download`)}
          footer={
            <Button type="primary" onClick={closeBuildModal}>
              {t(`Cancel`)}
            </Button>
          }
          closable={false}
          visible
          onCancel={closeBuildModal}
        >
          <DownloadFirmwareTimeline state={buildState} />
        </Modal>
      )}
      {dialogOpen && dialogTarget && (
        <SplashEditorDialog
          target={dialogTarget}
          allowApplyAndContinue={isLocal}
          onClose={() => setDialogOpen(false)}
          onApplied={(id) => {
            setDialogOpen(false);
            onApplied(id);
          }}
        />
      )}
    </>
  );
};

export default EditSplashButton;
