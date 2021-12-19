import { gql, useQuery } from "@apollo/client";
import {
  Alert,
  Button,
  Checkbox,
  Divider,
  Space,
  Typography,
  List,
  Card,
  Empty,
  Skeleton,
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
    "version" | "target" | "filters" | "sounds"
  >();
  const newVersion = parseParam("version");
  const newTarget = parseParam("target");
  const newSounds = parseParam("sounds");
  const { filters, encodeFilters } = useVersionFilters(parseParam("filters"));

  const sdcardAssetInfoQuery = useQuery(
    gql(/* GraphQL */ `
      query SdcardAssetInfo($directoryId: ID!) {
        sdcardDirectory(id: $directoryId) {
          id
          name
          version
          target
          sounds
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

  const sdcardInfo = sdcardAssetInfoQuery.data?.sdcardDirectory;

  const version = newVersion ?? sdcardInfo?.version;
  const target = newTarget ?? sdcardInfo?.target;
  // TODO: Allow more than one sound to be selected?
  const sounds = newSounds ?? sdcardInfo?.sounds[0];

  const selectedPack = sdcardPacksQuery.data?.edgeTxSdcardPackReleases.find(
    (release) => release.id === version
  );

  const sdcardSoundsQuery = useQuery(
    gql(/* GraphQL */ `
      query SdcardSoundsForPack($packId: ID!, $isPrerelease: Boolean!) {
        edgeTxSoundsRelease(forPack: $packId, isPrerelease: $isPrerelease) {
          id
          name
          sounds {
            id
            name
          }
        }
      }
    `),
    {
      variables: {
        packId: selectedPack?.id ?? "",
        isPrerelease: selectedPack?.isPrerelease ?? false,
      },
      skip: !selectedPack,
    }
  );

  const loading = sdcardAssetInfoQuery.loading || sdcardPacksQuery.loading;

  const availablePacks =
    sdcardPacksQuery.data?.edgeTxSdcardPackReleases.filter(
      (release) => !release.isPrerelease || filters.includePrereleases
    ) ?? [];
  const availableSounds = useSorted(
    sdcardSoundsQuery.data?.edgeTxSoundsRelease?.sounds,
    (s1, s2) => s1.id.localeCompare(s2.id)
  );

  const sortedTargets = useSorted(selectedPack?.targets, (t1, t2) =>
    t1.name.localeCompare(t2.name)
  );
  const selectedTarget = selectedPack?.targets.find((t) => t.id === target);
  const selectedSounds =
    sdcardSoundsQuery.data?.edgeTxSoundsRelease?.sounds.find(
      (sound) => sound.id === sounds
    );
  const soundsVersion = sdcardSoundsQuery.data?.edgeTxSoundsRelease?.id;

  return (
    <FullHeight>
      <Container>
        <FullHeight>
          <Centered>
            <div style={{ width: "100%", maxWidth: "400px" }}>
              {!sdcardAssetInfoQuery.loading &&
                !sdcardAssetInfoQuery.error &&
                (!sdcardInfo?.version || !sdcardInfo.target) && (
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
                    ...params,
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
            <Typography.Text>
              Available sounds {soundsVersion ? `(${soundsVersion})` : ""}
            </Typography.Text>
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
                        selected={
                          !!selectedSounds && item.id === selectedSounds.id
                        }
                        style={{ textAlign: "center" }}
                        key={item.id}
                        onClick={() => {
                          updateParams({
                            sounds:
                              selectedSounds?.id !== item.id ? item.id : "none",
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
        <Space style={{ margin: "8px" }} direction="vertical">
          <Checkbox>Remove existing data</Checkbox>
          <Space size="middle">
            <Button>Cancel</Button>
            <Button type="primary">Apply</Button>
          </Space>
        </Space>
      </Centered>
    </FullHeight>
  );
};

export default AssetsTab;
