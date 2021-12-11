import "antd/dist/antd.variable.min.css";
import "./Next.css";
import React from "react";
import { HashRouter } from "react-router-dom";
import { Layout, Menu, Typography } from "antd";
import FlashingWizard from "./pages/flash/v2/FlashingWizard";
import EdgeTxIcon from "./icon.webp";

const { Header, Content, Footer } = Layout;

const NextGeneration: React.FC = () => (
  <HashRouter>
    <Layout
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Header style={{ width: "100%" }}>
        <div
          style={{
            float: "left",
            marginRight: "16px",
            width: "150px",
            height: "100%",
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
        <Menu theme="dark" mode="horizontal" selectedKeys={["1"]}>
          <Menu.Item key="1">Flash</Menu.Item>
        </Menu>
      </Header>
      <Content
        className="site-layout"
        style={{
          padding: "16px 50px",
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
          <FlashingWizard />
        </div>
      </Content>
      <Footer style={{ textAlign: "center", padding: "8px" }}>
        EdgeTX ©2021
      </Footer>
    </Layout>
  </HashRouter>
);

export default NextGeneration;
