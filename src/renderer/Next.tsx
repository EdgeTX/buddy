import "antd/dist/antd.variable.min.css";
import "./Next.css";
import React from "react";
import { HashRouter } from "react-router-dom";
import { Layout, Menu, Breadcrumb } from "antd";
import FlashingWizard from "./pages/flash/v2/FlashingWizard";

const { Header, Content, Footer } = Layout;

const NextGeneration: React.FC = () => (
  <HashRouter>
    <Layout
      style={{ height: "100%", display: "flex", flexDirection: "column" }}
    >
      <Header style={{ position: "fixed", zIndex: 1, width: "100%" }}>
        <div className="logo" />
        <Menu theme="dark" mode="horizontal" defaultSelectedKeys={["2"]}>
          <Menu.Item key="1">nav 1</Menu.Item>
          <Menu.Item key="2">nav 2</Menu.Item>
          <Menu.Item key="3">nav 3</Menu.Item>
        </Menu>
      </Header>
      <Content
        className="site-layout"
        style={{
          padding: "0 50px",
          marginTop: 64,
          height: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Breadcrumb style={{ margin: "16px 0" }}>
          <Breadcrumb.Item>Home</Breadcrumb.Item>
          <Breadcrumb.Item>Flash</Breadcrumb.Item>
        </Breadcrumb>
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
      <Footer style={{ textAlign: "center" }}>EdgeTX ©2021</Footer>
    </Layout>
  </HashRouter>
);

export default NextGeneration;
