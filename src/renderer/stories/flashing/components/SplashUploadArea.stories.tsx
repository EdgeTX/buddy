import React from "react";
import SplashUploadArea from "renderer/components/splash/SplashUploadArea";

export default {
  title: "Flashing/Components/SplashUploadArea",
  component: SplashUploadArea,
};

export const empty: React.FC = () => (
  <div style={{ height: 300 }}>
    <SplashUploadArea onImageSelected={() => {}} />
  </div>
);
