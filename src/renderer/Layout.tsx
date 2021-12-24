import React from "react";
import { Layout, Menu, Typography } from "antd";
import { Link, useLocation } from "react-router-dom";
import useMedia from "use-media";
import config from "shared/config";
import styled from "styled-components";
import EdgeTxIcon from "./assets/logo.webp";

const { Header, Content, Footer } = Layout;

const DragableHeader = styled(Header)`
  app-region: drag;
  user-select: none;
  width: "100%";
`;

const AppLayout: React.FC = ({ children }) => {
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
            marginRight: config.isElectron ? "8px" : "16px",
            width: config.isElectron ? "132px" : "150px",
            height: "100%",
            marginLeft: config.isElectron ? "32px" : undefined,
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
        >
          <Menu.Item key="flash">
            <Link to="/flash">Flash</Link>
          </Menu.Item>
          <Menu.Item key="sdcard">
            <Link to="/sdcard">SD Card</Link>
          </Menu.Item>
        </Menu>
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
        <a href="https://github.com/freshollie/edgetx-buddy">source</a>
      </Footer>
    </Layout>
  );
};

export default AppLayout;
