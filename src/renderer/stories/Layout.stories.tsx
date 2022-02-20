import React from "react";
import { MemoryRouter } from "react-router-dom";
import Layout, { BaseLayout } from "renderer/Layout";

export default {
  title: "Layout",
  component: Layout,
};

export const layoutWithContent: React.FC = () => (
  <MemoryRouter>
    <Layout>
      <div>The layout</div>
    </Layout>
  </MemoryRouter>
);

export const windows: React.FC = () => (
  <MemoryRouter>
    <Layout windowsFrameless>
      <div>The layout</div>
    </Layout>
  </MemoryRouter>
);

export const macOs: React.FC = () => (
  <MemoryRouter>
    <Layout macFrameless>
      <div>The layout</div>
    </Layout>
  </MemoryRouter>
);

export const baseLayout: React.FC = () => <BaseLayout />;
