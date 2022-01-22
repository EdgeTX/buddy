import { UsbOutlined } from "@ant-design/icons";
import { Menu } from "antd";
import React from "react";
import { FullHeight } from "renderer/shared/layouts";
import styled from "styled-components";
import PrBuildsFlasher from "./flash/PrBuildsFlasher";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
`;

const DevPage: React.FC = () => (
  <FullHeight>
    <Container>
      <Menu
        onClick={() => {}}
        style={{ width: 256 }}
        defaultSelectedKeys={["1"]}
        defaultOpenKeys={["sub1"]}
        mode="inline"
      >
        <Menu.SubMenu key="sub1" icon={<UsbOutlined />} title="Flash">
          <Menu.Item key="1">PR Builds</Menu.Item>
        </Menu.SubMenu>
      </Menu>
      <FullHeight style={{ flex: 1, padding: "16px" }}>
        <PrBuildsFlasher />
      </FullHeight>
    </Container>
  </FullHeight>
);

export default DevPage;
