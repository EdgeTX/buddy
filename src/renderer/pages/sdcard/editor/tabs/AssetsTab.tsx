// src/renderer/pages/sdcard/editor/tabs/AssetsTab.tsx
import React from "react";
import {
  Alert,
  Button,
  Divider,
  Space,
  Typography,
  List,
  Card,
  Empty,
  Skeleton,
  message,
} from "antd";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import { useQuery, useMutation } from "@apollo/client";
import {
  SD_CARD_ASSET_INFO,
  SD_CARD_PACKS,
  SD_CARD_SOUNDS_FOR_PACK,
  CREATE_SDCARD_WRITE_JOB,
  SdcardAssetInfoData,
  SdcardAssetInfoVars,
  SdcardPacksData,
  SdcardPacksVars,
  SdcardSoundsForPackData,
  SdcardSoundsForPackVars,
  CreateSdcardWriteJobData,
  CreateSdcardWriteJobVars,
} from "renderer/pages/sdcard/editor/sdcard.gql";
import VersionTargetForm from "renderer/components/VersionTargetForm";
import useQueryParams from "renderer/hooks/useQueryParams";
import useVersionFilters from "renderer/hooks/useVersionFilters";
import useSorted from "renderer/hooks/useSorted";
import useIsoNames from "renderer/hooks/useIsoNames";
import JobExecutionModal from "renderer/pages/sdcard/editor/JobExecutionModal";
import { times } from "shared/tools";
import {
  Centered,
  FullHeight,
  FullHeightCentered,
} from "renderer/shared/layouts";
import SelectableListItem from "renderer/components/SelectableListItem";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  margin: 8px;
  overflow-y: auto;

  > * {
    flex: 1;
    margin-left: 16px;
    margin-right: 16px;
  }

  > .divider {
    flex: 0;
    height: 100%;
    margin: 0;
  }
`;

const AssetsTab: React.FC<{ directoryId: string }> = ({ directoryId }) => {
  // query‐param hooks
  const { parseParam, updateParams } = useQueryParams<
    | "packVersion"
    | "packTarget"
    | "filters"
    | "soundsVersion"
    | "soundsId"
    | "job"
  >();
  const newPackVersion = parseParam("packVersion");
  const newPackTarget = parseParam("packTarget");
  const newSoundsVersion = parseParam("soundsVersion");
  const newSoundsId = parseParam("soundsId");
  const currentJob = parseParam("job");
  const { filters, encodeFilters } = useVersionFilters(parseParam("filters"));

  // fetch SD-card directory info
  const {
    data: assetInfoData,
    loading: loadingAssetInfo,
    error: assetInfoError,
    refetch: refetchAssetInfo,
  } = useQuery<SdcardAssetInfoData, SdcardAssetInfoVars>(SD_CARD_ASSET_INFO, {
    variables: { directoryId },
  });

  // fetch available packs
  const { data: packsData, loading: loadingPacks } = useQuery<
    SdcardPacksData,
    SdcardPacksVars
  >(SD_CARD_PACKS);

  // determine selected pack ID
  const currentVersion = assetInfoData?.sdcardDirectory?.pack.version ?? "";
  const packVersion = newPackVersion ?? currentVersion;
  const selectedPackRelease =
    packsData?.edgeTxSdcardPackReleases.find((r) => r.id === packVersion) ??
    null;

  // fetch sounds for that pack
  const { data: soundsData, loading: loadingSounds } = useQuery<
    SdcardSoundsForPackData,
    SdcardSoundsForPackVars
  >(SD_CARD_SOUNDS_FOR_PACK, {
    variables: {
      packId: selectedPackRelease?.id,
      isPrerelease: selectedPackRelease?.isPrerelease ?? false,
      soundsVersion:
        newSoundsVersion ?? assetInfoData?.sdcardDirectory?.sounds.version,
    },
    skip: !selectedPackRelease,
  });

  // mutation to create write job
  const [createWriteJob, { loading: creatingJob }] = useMutation<
    CreateSdcardWriteJobData,
    CreateSdcardWriteJobVars
  >(CREATE_SDCARD_WRITE_JOB, {
    onError: (e) => message.error(`Could not update SD Card: ${e.message}`),
  });

  // Derived state
  const sdcardInfo = assetInfoData?.sdcardDirectory;
  const packTarget = newPackTarget ?? sdcardInfo?.pack.target ?? "";
  const currentSoundsVersion = sdcardInfo?.sounds.version ?? "";
  const soundsVersion = newSoundsVersion ?? currentSoundsVersion;
  const soundsList = soundsData?.edgeTxSoundsRelease?.sounds ?? [];
  const availableSounds = useIsoNames(
    useSorted(soundsList, (a, b) => a.localeCompare(b))
  );

  const soundsId = newSoundsId ?? sdcardInfo?.sounds.ids[0] ?? "";

  // Build version & target options as simple {id,name}[] or null
  const versionOptions =
    packsData?.edgeTxSdcardPackReleases
      .filter((r) => !r.isPrerelease || filters.includePrereleases)
      .map((r) => ({ id: r.id, name: r.name })) ?? null;

  const targetOptions =
    selectedPackRelease?.targets.map((t) => ({ id: t.id, name: t.name })) ??
    null;

  // Prepare the <Card> children in a plain if/else chain
  let soundsContent: React.ReactNode;
  if (loadingSounds) {
    soundsContent = times(4).map((i) => (
      <Skeleton.Input
        key={i}
        active
        style={{ width: "100%", marginBottom: 8 }}
      />
    ));
  } else if (!selectedPackRelease) {
    soundsContent = (
      <FullHeightCentered style={{ alignItems: "center" }}>
        <Empty
          style={{ margin: "8px" }}
          className="ant-empty-normal"
          imageStyle={{ height: "unset", fontSize: "32px" }}
          image={<ExclamationCircleOutlined />}
          description={<p>Select SD Card version to see available sounds</p>}
        />
      </FullHeightCentered>
    );
  } else {
    soundsContent = (
      <List<{ id: string; name: string }>
        size="large"
        style={{ height: "100%" }}
        dataSource={availableSounds}
        renderItem={(item) => (
          <SelectableListItem
            key={item.id}
            aria-selected={item.id === soundsId}
            style={{ textAlign: "center" }}
            onClick={() =>
              updateParams({
                soundsId: item.id === soundsId ? undefined : item.id,
              })
            }
          >
            {item.name}
          </SelectableListItem>
        )}
      />
    );
  }

  return (
    <>
      {currentJob && (
        <JobExecutionModal
          jobId={currentJob}
          onCompleted={() => {
            updateParams({
              job: undefined,
              packVersion: undefined,
              packTarget: undefined,
              soundsVersion: undefined,
              soundsId: undefined,
            });
            void refetchAssetInfo();
          }}
          onCancelled={() => {
            updateParams({ job: undefined });
            void refetchAssetInfo();
          }}
        />
      )}

      <FullHeight>
        <Container>
          {/* Version/Target column */}
          <FullHeight>
            <Centered>
              <div style={{ width: "100%", maxWidth: "400px" }}>
                {!loadingAssetInfo &&
                  !assetInfoError &&
                  (!sdcardInfo?.pack.version || !sdcardInfo.pack.target) && (
                    <Alert
                      message="Warning"
                      description="Could not detect current version; select and apply."
                      type="warning"
                      showIcon
                      style={{ marginBottom: "16px" }}
                    />
                  )}
                <VersionTargetForm
                  disabled={!sdcardInfo || loadingAssetInfo || loadingPacks}
                  versions={{
                    available: versionOptions,
                    selectedId: packVersion,
                  }}
                  targets={{
                    available: targetOptions,
                    selectedId: packTarget,
                  }}
                  filters={filters}
                  onChanged={({ version, target, filters: f }) =>
                    updateParams({
                      packVersion:
                        version === sdcardInfo?.pack.version
                          ? undefined
                          : version,
                      packTarget:
                        target === sdcardInfo?.pack.target ? undefined : target,
                      filters: encodeFilters(f),
                    })
                  }
                />
              </div>
            </Centered>
          </FullHeight>

          <Divider type="vertical" className="divider" />
          {/* Sounds Column */}
          <FullHeightCentered style={{ alignItems: "center" }}>
            <FullHeight
              style={{
                width: "100%",
                maxWidth: "300px",
              }}
            >
              <Typography style={{ lineHeight: "48px" }}>
                Available sounds {soundsVersion ? `(${soundsVersion})` : ""}
              </Typography>
              <Card
                style={{
                  height: "100%",
                  width: "100%",
                  maxHeight: "500px",
                  overflowY: "auto",
                }}
                bodyStyle={{ height: "100%", padding: 0 }}
              >
                {soundsContent}
              </Card>
            </FullHeight>
          </FullHeightCentered>
        </Container>
        {/* Bottom buttons */}
        <Centered>
          <Space size="middle" style={{ marginTop: 16 }}>
            <Button
              disabled={
                creatingJob ||
                (!newPackVersion &&
                  !newPackTarget &&
                  !newSoundsVersion &&
                  !newSoundsId)
              }
              onClick={() =>
                updateParams({
                  packVersion: undefined,
                  packTarget: undefined,
                  soundsVersion: undefined,
                  soundsId: undefined,
                })
              }
            >
              Revert changes
            </Button>

            <Button
              type="primary"
              disabled={
                creatingJob ||
                (!newPackVersion &&
                  !newPackTarget &&
                  !newSoundsVersion &&
                  !newSoundsId)
              }
              onClick={() => {
                void createWriteJob({
                  variables: {
                    directoryId,
                    pack:
                      newPackVersion || newPackTarget
                        ? { version: packVersion, target: packTarget }
                        : null,
                    sounds:
                      newSoundsVersion || newSoundsId
                        ? { ids: [soundsId], version: soundsVersion }
                        : null,
                  },
                }).then((res) => {
                  const jobId = res.data?.createSdcardWriteJob.id;
                  if (jobId) updateParams({ job: jobId });
                });
              }}
            >
              Apply changes
            </Button>

            <Button
              type="default"
              disabled={
                creatingJob ||
                !packVersion ||
                !packTarget ||
                !soundsVersion ||
                !soundsId
              }
              onClick={() => {
                void createWriteJob({
                  variables: {
                    directoryId,
                    pack: { version: packVersion, target: packTarget },
                    sounds: { ids: [soundsId], version: soundsVersion },
                    clean: true,
                  },
                }).then((res) => {
                  const jobId = res.data?.createSdcardWriteJob.id;
                  if (jobId) updateParams({ job: jobId });
                });
              }}
            >
              Re-install
            </Button>
          </Space>
        </Centered>
      </FullHeight>
    </>
  );
};

export default AssetsTab;
