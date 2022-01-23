import { BranchesOutlined, UsbOutlined } from "@ant-design/icons";
import { Menu } from "antd";
import React, { useEffect, useState } from "react";
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
  const [openedMenus, setOpenedMenus] = useState<string[]>([]);
  const location = useLocation();
  const isWide = useIsWide();

  const [sub, page] = location.pathname.replace(route, "").split("/");

  useEffect(() => {
    if (sub) {
      setOpenedMenus((existing) =>
        existing.includes(sub) ? existing : existing.concat(sub)
      );
    }
  }, [sub, setOpenedMenus]);

  return (
    <FullHeight>
      <Container>
        <Menu
          style={{ maxWidth: isWide ? 300 : 180 }}
          selectedKeys={[sub ?? "", page ?? ""]}
          openKeys={openedMenus}
          mode="inline"
        >
          <Menu.SubMenu
            onTitleClick={(e) => {
              setOpenedMenus(
                openedMenus.includes(e.key)
                  ? openedMenus.filter((m) => m !== e.key)
                  : openedMenus.concat([e.key])
              );
            }}
            key="flash"
            icon={<UsbOutlined />}
            title="Firmware"
          >
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
