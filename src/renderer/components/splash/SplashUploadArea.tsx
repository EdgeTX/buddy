import { PictureOutlined, LoadingOutlined } from "@ant-design/icons";
import { Upload, message } from "antd";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import styled from "styled-components";

type Props = {
  onImageSelected: (image: ImageBitmap, fileName: string) => void;
};

const UploadContainer = styled.div`
  height: 100%;
  > span {
    height: 100%;
  }
`;

const SplashUploadArea: React.FC<Props> = ({ onImageSelected }) => {
  const { t } = useTranslation("flashing");
  const [loading, setLoading] = useState(false);
  // onImageSelected typically causes the parent to unmount this component
  // immediately (swapping in the canvas view) - guard the post-await state
  // update so it's a no-op once that's already happened.
  const mountedRef = useRef(true);
  useEffect(
    () => () => {
      mountedRef.current = false;
    },
    []
  );

  return (
    <UploadContainer>
      <Upload.Dragger
        style={{ padding: "48px 32px", height: "100%" }}
        showUploadList={false}
        multiple={false}
        disabled={loading}
        accept="image/*"
        beforeUpload={async (file) => {
          if (!file.type.startsWith("image/")) {
            await message.error(t(`Not an image file`));
            return false;
          }
          setLoading(true);
          try {
            const bitmap = await createImageBitmap(file);
            onImageSelected(bitmap, file.name);
          } catch {
            await message.error(t(`Could not read image file`));
          } finally {
            if (mountedRef.current) {
              setLoading(false);
            }
          }
          return false;
        }}
      >
        <p className="ant-upload-drag-icon">
          {loading ? <LoadingOutlined /> : <PictureOutlined />}
        </p>
        <p className="ant-upload-text">
          {loading
            ? t(`Loading...`)
            : t(`Click here to select an image, or drag it here to upload.`)}
        </p>
      </Upload.Dragger>
    </UploadContainer>
  );
};

export default SplashUploadArea;
