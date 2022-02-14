import React from "react";
import { Layout, Menu, Typography } from "antd";
import { Link, useLocation } from "react-router-dom";
import styled from "styled-components";
import { ArrowRightOutlined, GithubOutlined } from "@ant-design/icons";
import { useTranslation, Trans } from "react-i18next";
import EdgeTxIcon from "./assets/logo.webp";
import WindowsNav from "./components/WindowsNav";
import useIsMobile from "./hooks/useIsMobile";
import { useSettings } from "./settings";
import SettingsMenu from "./components/SettingsMenu";
import useIsWide from "./hooks/useIsWide";

const { Header, Content, Footer } = Layout;

const DragableHeader = styled(Header)`
  -webkit-app-region: drag;
  -webkit-user-select: none;
  user-select: none;
  width: 100%;

  // In largers windows we can use flex here
  @media screen and (min-width: 800px) {
    display: flex;
    padding-right: 0;
  }

  li {
    -webkit-app-region: no-drag;
  }
`;

const MainLayout = styled(Layout)`
  min-height: 100%;
  display: flex;
  flex-direction: column;
`;

const FooterElements = styled.div`
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: space-between;
  padding-left: 16px;
  padding-right: 16px;
  text-align: center;

  @media screen and (max-width: 800px) {
    justify-content: center;
  }
`;

const MenuIcons = styled.div`
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;
  padding-right: 32px;
  line-height: normal;

  > * {
    padding-left: 16px;
    padding-right: 16px;
  }
`;

// TODO: use this if we want the menu labels to spill over multiple lines
// const MenuLabel = styled.div`
//   white-space: normal;
//   width: 64px;
//   line-height: initial;
//   text-align: center;
//   display: flex;
//   justify-content: center;
//   align-items: center;
//   // Height of top-bar
//   height: 64px;
// `;

type Props = {
  macFrameless?: boolean;
  windowsFrameless?: boolean;
};

const AppLayout: React.FC<Props> = ({
  children,
  macFrameless,
  windowsFrameless,
}) => {
  const isWide = useIsWide();
  const isMobile = useIsMobile();
  const location = useLocation();
  const [settings] = useSettings();
  const { t } = useTranslation();

  return (
    <MainLayout
      style={{
        height: !isMobile ? "100%" : undefined,
      }}
    >
      <DragableHeader
        style={isMobile ? { padding: "0", paddingLeft: "16px" } : undefined}
      >
        <div
          style={{
            float: "left",
            marginRight: macFrameless ? "8px" : "16px",
            width: macFrameless ? "132px" : "150px",
            height: "100%",
            marginLeft: macFrameless ? "32px" : undefined,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              height: "100%",
            }}
          >
            <img
              alt="edgetx-logo"
              src={EdgeTxIcon as string}
              style={{ height: "40px", marginRight: "8px" }}
            />
            <Typography.Title
              level={3}
              style={{ color: "white", marginBottom: 0 }}
            >
              Buddy
            </Typography.Title>
          </div>
        </div>
        <Menu
          theme="dark"
          mode="horizontal"
          selectedKeys={[location.pathname.split("/")[1] as string]}
          style={{ flex: 1, boxShadow: "none" }}
        >
          <Menu.Item key="flash">
            <Link to="/flash">{t(`Radio firmware`)}</Link>
          </Menu.Item>
          <Menu.Item key="sdcard">
            <Link to="/sdcard">{t(`SD Card content`)}</Link>
          </Menu.Item>
          {settings.expertMode && (
            <Menu.Item key="dev">
              <Link to="/dev">{t(`Dev tools`)}</Link>
            </Menu.Item>
          )}
        </Menu>
        <MenuIcons style={{ paddingRight: windowsFrameless ? 0 : undefined }}>
          <a target="_blank" href="https://github.com/EdgeTX" rel="noreferrer">
            <GithubOutlined style={{ color: "white", fontSize: "16px" }} />
          </a>
          <SettingsMenu />
        </MenuIcons>
        {windowsFrameless && <WindowsNav />}
      </DragableHeader>
      <Content
        className="site-layout"
        style={{
          padding: isWide ? "16px 50px" : undefined,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div
          className="site-layout-background"
          style={{
            padding: 24,
            minHeight: "100%",
            height: !isMobile ? "100%" : undefined,
            display: "flex",
            flex: 1,
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </Content>
      <Footer
        style={{
          padding: "8px",
          backgroundColor: "#e6f7ff",
          position: "sticky",
          bottom: 0,
        }}
      >
        <FooterElements>
          {!isMobile && (
            <div>
              <Trans>
                Built with ♥ by the EdgeTX contributors -{" "}
                <a
                  target="_blank"
                  href="https://github.com/EdgeTX/buddy"
                  rel="noreferrer"
                >
                  source
                </a>
              </Trans>
            </div>
          )}
          <div>
            <Trans>
              Donate and support EdgeTX development{" "}
              <a
                target="_blank"
                href="https://opencollective.com/edgetx"
                rel="noreferrer"
              >
                <ArrowRightOutlined />
              </a>
            </Trans>
          </div>
        </FooterElements>
      </Footer>
    </MainLayout>
  );
};

export default AppLayout;
