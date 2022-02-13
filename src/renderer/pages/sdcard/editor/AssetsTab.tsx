import { gql, useMutation, useQuery } from "@apollo/client";
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
import React from "react";
import VersionTargetForm from "renderer/components/VersionTargetForm";
import useQueryParams from "renderer/hooks/useQueryParams";
import useVersionFilters from "renderer/hooks/useVersionFilters";
import {
  Centered,
  FullHeight,
  FullHeightCentered,
} from "renderer/shared/layouts";
import styled from "styled-components";
import { ExclamationCircleOutlined } from "@ant-design/icons";
import SelectableListItem from "renderer/components/SelectableListItem";
import useSorted from "renderer/hooks/useSorted";
import { times } from "shared/tools";
import useIsoNames from "renderer/hooks/useIsoNames";
import JobExecutionModal from "./JobExecutionModal";

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

  const sdcardAssetInfoQuery = useQuery(
    gql(/* GraphQL */ `
      query SdcardAssetInfo($directoryId: ID!) {
        sdcardDirectory(id: $directoryId) {
          id
          name
          pack {
            target
            version
          }
          sounds {
            ids
            version
          }
        }
      }
    `),
    {
      variables: {
        directoryId,
      },
    }
  );

  const sdcardPacksQuery = useQuery(
    gql(/* GraphQL */ `
      query SdcardPacks {
        edgeTxSdcardPackReleases {
          id
          name
          isPrerelease
          targets {
            id
            name
          }
        }
      }
    `)
  );

  const [createWriteJob, { loading: creatingJob }] = useMutation(
    gql(/* GraphQL */ `
      mutation CreateSdcardPackAndSoundsWriteJob(
        $directoryId: ID!
        $pack: SdcardPackInput
        $sounds: SdcardSoundsInput
        $clean: Boolean
      ) {
        createSdcardWriteJob(
          pack: $pack
          sounds: $sounds
          clean: $clean
          directoryId: $directoryId
        ) {
          id
        }
      }
    `),
    {
      onError: (e) => {
        void message.error(`Could not update SD Card: ${e.message}`);
      },
    }
  );

  const sdcardInfo = sdcardAssetInfoQuery.data?.sdcardDirectory;

  const currentPackVersion = sdcardInfo?.pack.version;
  const packVersion = newPackVersion ?? sdcardInfo?.pack.version;

  const currentPackTarget = sdcardInfo?.pack.target;
  const packTarget = newPackTarget ?? sdcardInfo?.pack.target;

  // TODO: Allow more than one sound to be selected?
  const soundsId = newSoundsId ?? sdcardInfo?.sounds.ids[0];

  const selectedPack = sdcardPacksQuery.data?.edgeTxSdcardPackReleases.find(
    (release) => release.id === packVersion
  );

  const sdcardSoundsQuery = useQuery(
    gql(/* GraphQL */ `
      query SdcardSoundsForPack(
        $packId: ID
        $soundsVersion: ID
        $isPrerelease: Boolean!
      ) {
        edgeTxSoundsRelease(
          forPack: $packId
          id: $soundsVersion
          isPrerelease: $isPrerelease
        ) {
          id
          name
          sounds
        }
      }
    `),
    {
      variables: {
        packId: selectedPack?.id ?? "",
        isPrerelease: selectedPack?.isPrerelease ?? false,
        soundsVersion: newSoundsVersion ?? sdcardInfo?.sounds.version,
      },
      skip: !selectedPack,
    }
  );

  const soundsVersion =
    newSoundsVersion ??
    sdcardInfo?.sounds.version ??
    sdcardSoundsQuery.data?.edgeTxSoundsRelease?.id;

  const loading = sdcardAssetInfoQuery.loading || sdcardPacksQuery.loading;

  const availablePacks =
    sdcardPacksQuery.data?.edgeTxSdcardPackReleases.filter(
      (release) => !release.isPrerelease || filters.includePrereleases
    ) ?? [];
  const availableSounds = useIsoNames(
    useSorted(sdcardSoundsQuery.data?.edgeTxSoundsRelease?.sounds, (s1, s2) =>
      s1.localeCompare(s2)
    )
  );

  const sortedTargets = useSorted(selectedPack?.targets, (t1, t2) =>
    t1.name.localeCompare(t2.name)
  );
  const selectedTarget = selectedPack?.targets.find((t) => t.id === packTarget);
  const selectedSounds = [soundsId];
  const foundSoundsVersion = sdcardSoundsQuery.data?.edgeTxSoundsRelease?.id;

  return (
    <>
      {currentJob && (
        <JobExecutionModal
          jobId={currentJob}
          onCompleted={() => {
            updateParams({
              job: undefined,
              soundsVersion: undefined,
              soundsId: undefined,
              packVersion: undefined,
              packTarget: undefined,
            });
            void sdcardAssetInfoQuery.refetch();
          }}
          onCancelled={() => {
            updateParams({
              job: undefined,
            });
            void sdcardAssetInfoQuery.refetch();
          }}
        />
      )}
      <FullHeight>
        <Container>
          <FullHeight>
            <Centered>
              <div style={{ width: "100%", maxWidth: "400px" }}>
                {!sdcardAssetInfoQuery.loading &&
                  !sdcardAssetInfoQuery.error &&
                  (!sdcardInfo?.pack.version || !sdcardInfo.pack.target) && (
                    <Alert
                      message="Warning"
                      description="Could not detect current version, select your radio and EdgeTX version and apply changes to setup your SD Card"
                      type="warning"
                      showIcon
                      style={{ marginBottom: "16px" }}
                    />
                  )}
                <VersionTargetForm
                  onChanged={(params) => {
                    updateParams({
                      packVersion:
                        currentPackVersion === params.version
                          ? undefined
                          : params.version,
                      packTarget:
                        currentPackTarget === params.target
                          ? undefined
                          : params.target,
                      filters: encodeFilters(params.filters),
                    });
                  }}
                  disabled={!sdcardInfo || loading}
                  versions={{
                    available: availablePacks,
                    selectedId: selectedPack?.id,
                  }}
                  targets={{
                    available: sortedTargets,
                    selectedId: selectedTarget?.id,
                  }}
                  filters={filters}
                />
              </div>
            </Centered>
          </FullHeight>
          <Divider type="vertical" className="divider" />
          <FullHeightCentered style={{ alignItems: "center" }}>
            <FullHeight
              style={{
                width: "100%",
                maxWidth: "300px",
              }}
            >
              <Typography style={{ lineHeight: "48px" }}>
                Available sounds{" "}
                {foundSoundsVersion ? `(${foundSoundsVersion})` : ""}
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
                {selectedPack ? (
                  <List
                    size="large"
                    style={{ height: "100%" }}
                    dataSource={
                      !sdcardSoundsQuery.loading
                        ? availableSounds
                        : times(4).map((i) => ({
                            id: i.toString(),
                            name: i.toString(),
                          }))
                    }
                    renderItem={(item) =>
                      sdcardSoundsQuery.loading ? (
                        <Skeleton.Input
                          style={{ width: "100%" }}
                          key={item.id}
                          active
                        />
                      ) : (
                        <SelectableListItem
                          aria-selected={
                            selectedSounds.length > 0 &&
                            selectedSounds.includes(item.id)
                          }
                          style={{ textAlign: "center" }}
                          key={item.id}
                          onClick={() => {
                            const emptySounds =
                              (sdcardInfo?.sounds.ids.length ?? 0) > 0
                                ? "none"
                                : undefined;
                            updateParams({
                              soundsId: !selectedSounds.includes(item.id)
                                ? item.id
                                : emptySounds,
                            });
                          }}
                        >
                          {item.name}
                        </SelectableListItem>
                      )
                    }
                  />
                ) : (
                  <FullHeightCentered style={{ alignItems: "center" }}>
                    <Empty
                      style={{ margin: "8px" }}
                      className="ant-empty-normal"
                      imageStyle={{
                        height: "unset",
                        fontSize: "32px",
                      }}
                      image={<ExclamationCircleOutlined />}
                      description={
                        <p>Select SD Card version to see available sounds</p>
                      }
                    />
                  </FullHeightCentered>
                )}
              </Card>
            </FullHeight>
          </FullHeightCentered>
        </Container>
        <Centered>
          <Space size="middle">
            <Button
              disabled={
                (!newSoundsVersion &&
                  !newPackVersion &&
                  !newPackTarget &&
                  !newSoundsId) ||
                creatingJob
              }
              onClick={() => {
                updateParams({
                  job: undefined,
                  soundsVersion: undefined,
                  soundsId: undefined,
                  packVersion: undefined,
                  packTarget: undefined,
                });
              }}
            >
              Revert changes
            </Button>
            <Button
              disabled={
                (!newSoundsVersion &&
                  !newPackVersion &&
                  !newPackTarget &&
                  !newSoundsId) ||
                creatingJob
              }
              type="primary"
              onClick={() => {
                if (
                  newSoundsVersion ||
                  newPackVersion ||
                  newPackTarget ||
                  newSoundsId
                ) {
                  void createWriteJob({
                    variables: {
                      directoryId,
                      pack:
                        newPackVersion || newPackTarget
                          ? {
                              version: packVersion!,
                              target: packTarget!,
                            }
                          : null,
                      sounds:
                        newSoundsVersion || newSoundsId
                          ? {
                              ids: [soundsId!],
                              version: soundsVersion!,
                            }
                          : null,
                    },
                  }).then((result) => {
                    if (result.data?.createSdcardWriteJob.id) {
                      updateParams({
                        job: result.data.createSdcardWriteJob.id,
                      });
                    }
                  });
                }
              }}
            >
              Apply changes
            </Button>
            <Button
              disabled={
                !soundsVersion ||
                !soundsId ||
                !packVersion ||
                !packTarget ||
                creatingJob
              }
              type="default"
              onClick={() => {
                if (soundsVersion && soundsId && packVersion && packTarget) {
                  void createWriteJob({
                    variables: {
                      directoryId,
                      pack: {
                        version: packVersion,
                        target: packTarget,
                      },
                      sounds: {
                        version: soundsVersion,
                        ids: [soundsId],
                      },
                      clean: true,
                    },
                  }).then((result) => {
                    if (result.data?.createSdcardWriteJob.id) {
                      updateParams({
                        job: result.data.createSdcardWriteJob.id,
                      });
                    }
                  });
                }
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
