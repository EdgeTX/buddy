import { BranchesOutlined, UsbOutlined } from "@ant-design/icons";
import { Menu } from "antd";
import React from "react";
import { Route, Routes, Navigate, useLocation } from "react-router-dom";
import useIsWide from "renderer/hooks/useIsWide";
import { FullHeight } from "renderer/shared/layouts";
import styled from "styled-components";
import PrBuildsFlasher from "./flash/PrBuildsFlasher";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;
`;

const AdvancedPage: React.FC<{ route?: string }> = ({ route = "" }) => {
  const location = useLocation();
  const isWide = useIsWide();

  const [sub, page] = location.pathname.replace(route, "").split("/");
  return (
    <FullHeight>
      <Container>
        <Menu
          onClick={() => {}}
          style={{ maxWidth: isWide ? 300 : "min-content" }}
          selectedKeys={[sub ?? "", page ?? ""]}
          openKeys={[sub ?? ""]}
          mode="inline"
        >
          <Menu.SubMenu key="flash" icon={<UsbOutlined />} title="Firmware">
            <Menu.Item icon={<BranchesOutlined />} key="pr">
              PR Builds
            </Menu.Item>
          </Menu.SubMenu>
        </Menu>
        <FullHeight style={{ flex: 1, padding: "16px" }}>
          <Routes>
            <Route path="flash/pr" element={<PrBuildsFlasher />} />
            <Route path="*" element={<Navigate replace to="flash/pr" />} />
          </Routes>
        </FullHeight>
      </Container>
    </FullHeight>
  );
};

export default AdvancedPage;
