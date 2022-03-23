import {
  BranchesOutlined,
  UnlockOutlined,
  UsbOutlined,
} from "@ant-design/icons";
import { Menu } from "antd";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Route,
  Routes,
  Navigate,
  useLocation,
  useNavigate,
} from "react-router-dom";
import useIsWide from "renderer/hooks/useIsWide";
import { FullHeight } from "renderer/shared/layouts";
import styled from "styled-components";
import FlashUnlocker from "./flash/FlashUnlocker";
import PrBuildsFlasher from "./flash/PrBuildsFlasher";

const Container = styled.div`
  display: flex;
  flex-direction: row;
  height: 100%;

  .dev-tools-page {
    flex: 1;
  }
`;

const DevTools: React.FC<{ route?: string }> = ({ route = "" }) => {
  const { t } = useTranslation("devtools");
  const [openedMenus, setOpenedMenus] = useState<string[]>([]);
  const location = useLocation();
  const navigate = useNavigate();
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
          style={{ maxWidth: isWide ? 300 : 150 }}
          selectedKeys={[sub ?? "", page ?? ""]}
          openKeys={openedMenus}
          mode="inline"
          onClick={(item) => {
            navigate(`${item.keyPath.reverse().join("/")}`);
          }}
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
            title={t(`Flashing`)}
          >
            <Menu.Item icon={<BranchesOutlined />} key="pr">
              {t(`PR Builds`)}
            </Menu.Item>
            <Menu.Item icon={<UnlockOutlined />} key="unlock">
              {t(`Unlocker`)}
            </Menu.Item>
          </Menu.SubMenu>
        </Menu>
        <FullHeight className="dev-tools-page">
          <Routes>
            <Route path="flash/pr" element={<PrBuildsFlasher />} />
            <Route path="flash/unlock" element={<FlashUnlocker />} />
            <Route path="*" element={<Navigate replace to="flash/pr" />} />
          </Routes>
        </FullHeight>
      </Container>
    </FullHeight>
  );
};

export default DevTools;
