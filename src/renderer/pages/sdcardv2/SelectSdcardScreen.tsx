import {
  FolderOpenTwoTone,
  PoweroffOutlined,
  UsbOutlined,
  FolderOutlined,
} from "@ant-design/icons";
import { Button, Typography, Divider } from "antd";
import React from "react";
import {
  FullHeightCentered,
  FullHeight,
  Centered,
} from "renderer/shared/layouts";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useMutation, gql } from "@apollo/client";

const Container = styled.div`
  display: flex;
  height: 100%;
  width: 100%;
`;

const Circle = styled(Centered)`
  border-radius: 64px;
  background-color: #d9d9d9;
  width: 72px;
  min-width: 72px;
  height: 72px;
  min-height: 72px;
  color: white;
  margin: 16px;
  text-align: center;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
`;

const SelectSdcardScreen: React.FC = () => {
  const navigate = useNavigate();

  const [selectDirectory] = useMutation(
    gql(/* GraphQL */ `
      mutation PickSdcardDirectory {
        pickSdcardDirectory {
          id
        }
      }
    `)
  );

  return (
    <Container>
      <FullHeightCentered style={{ flex: 1, alignItems: "center" }}>
        <FullHeight
          style={{
            maxWidth: 600,
            width: "100%",
            maxHeight: 900,
            justifyContent: "space-between",
          }}
        >
          <Step>
            <Circle>
              <PoweroffOutlined style={{ fontSize: "32px" }} />
            </Circle>
            <Typography.Text style={{ fontSize: "16px" }}>
              <b>Step 1.</b> Power on your device, make sure it&apos;s not
              plugged into USB
            </Typography.Text>
          </Step>
          <Step style={{ justifyContent: "flex-end" }}>
            <Typography.Text style={{ fontSize: "16px" }}>
              <b>Step 2.</b> Connect your device to the computer via USB, and if
              prompted select &quot;<i>USB Storage</i>&quot;
            </Typography.Text>
            <Circle>
              <UsbOutlined style={{ fontSize: "32px" }} />
            </Circle>
          </Step>
          <Step>
            <Circle>
              <FolderOutlined style={{ fontSize: "32px" }} />
            </Circle>
            <Typography.Text style={{ fontSize: "16px" }}>
              <b>Step 3.</b> Once connected, select the devices SD Card via the
              file explorer to make changes
            </Typography.Text>
          </Step>
        </FullHeight>
      </FullHeightCentered>
      <Divider type="vertical" style={{ height: "100%" }} />
      <FullHeightCentered style={{ flex: 1, maxWidth: "600px" }}>
        <Centered>
          <FolderOpenTwoTone style={{ fontSize: "48px", margin: "16px" }} />
          <Button
            onClick={() => {
              void selectDirectory().then((result) => {
                if (result.data?.pickSdcardDirectory) {
                  const directory = result.data.pickSdcardDirectory;
                  navigate(`/sdcard/${directory.id}`);
                }
              });
            }}
          >
            Select SD Card
          </Button>
        </Centered>
      </FullHeightCentered>
    </Container>
  );
};

export default SelectSdcardScreen;
