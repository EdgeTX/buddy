import { gql, useQuery } from "@apollo/client";
import { Alert, Button, Checkbox, Divider, Space, Typography } from "antd";
import React from "react";
import VersionTargetForm from "renderer/components/VersionTargetForm";
import { Centered, FullHeight } from "renderer/shared/layouts";
import styled from "styled-components";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
  margin: 8px;

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
  const { data, loading } = useQuery(
    gql(/* GraphQL */ `
      query SdcardBaseAssets($directoryId: ID!) {
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

  return (
    <FullHeight>
      <Container>
        <FullHeight>
          <Typography.Title level={5}>Base Assets</Typography.Title>
          <Centered>
            {data &&
              (!data.sdcardDirectory?.version ||
                (!data.sdcardDirectory.target && (
                  <Alert
                    message="Warning"
                    description="Could not detect current version, select your radio and EdgeTX version to apply changes"
                    type="warning"
                    showIcon
                  />
                )))}
            <VersionTargetForm
              onChanged={() => {}}
              disabled={!data?.sdcardDirectory || loading}
              versions={{ available: [] }}
              targets={{ available: [] }}
              filters={{
                includePrereleases: true,
              }}
            />
          </Centered>
        </FullHeight>
        <Divider type="vertical" className="divider" />
        <FullHeight>
          <Typography.Title level={5}>Sounds</Typography.Title>
          <Centered>Sounds list</Centered>
        </FullHeight>
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
