import React from "react";
import { Layout, Menu, Typography } from "antd";
import { Link, useLocation } from "react-router-dom";
import useMedia from "use-media";
import styled from "styled-components";
import EdgeTxIcon from "./assets/logo.webp";
import WindowsNav from "./components/WindowsNav";

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
  const isWide = useMedia({ minWidth: "1200px" });
  const location = useLocation();
  return (
    <Layout
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <DragableHeader>
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
            <Link to="/flash">Radio firmware</Link>
          </Menu.Item>
          <Menu.Item key="sdcard">
            <Link to="/sdcard">SD Card content</Link>
          </Menu.Item>
        </Menu>
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
            height: "100%",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {children}
        </div>
      </Content>
      <Footer style={{ textAlign: "center", padding: "8px" }}>
        Built with ♥ by the EdgeTX contributors -{" "}
        <a
          target="_blank"
          href="https://github.com/EdgeTX/buddy"
          rel="noreferrer"
        >
          source
        </a>
      </Footer>
    </Layout>
  );
};

export default AppLayout;
