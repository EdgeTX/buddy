import React from "react";
import { Layout, Menu, Typography } from "antd";
import { Link } from "react-router-dom";
import EdgeTxIcon from "./assets/logo.webp";

const { Header, Content, Footer } = Layout;

const AppLayout: React.FC = ({ children }) => (
  <Layout style={{ height: "100%", display: "flex", flexDirection: "column" }}>
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
      <Menu theme="dark" mode="horizontal">
        <Menu.Item key="1">
          <Link to="/flash">Flash</Link>
        </Menu.Item>
        <Menu.Item key="2">
          <Link to="/sdcard">SD Card</Link>
        </Menu.Item>
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
        {children}
      </div>
    </Content>
    <Footer style={{ textAlign: "center", padding: "8px" }}>
      Built with ♥ by the EdgeTX contributors -{" "}
      <a href="https://github.com/freshollie/edgetx-buddy">source</a>
    </Footer>
  </Layout>
);

export default AppLayout;
