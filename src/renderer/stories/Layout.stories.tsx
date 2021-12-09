import React from "react";
import { MemoryRouter } from "react-router-dom";
import Layout from "renderer/Layout";

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
