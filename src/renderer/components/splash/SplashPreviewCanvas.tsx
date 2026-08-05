import React, { useEffect, useRef } from "react";
import { GrayscaleImage } from "shared/splash";

type Props = {
  image: GrayscaleImage;
  zoom?: number;
};

/** Renders pre-dithered grayscale pixels at a pixelated zoom level, the
 * same "preview at Nx before committing" approach EdgeTX Companion's own
 * splash dialogs use. */
const SplashPreviewCanvas: React.FC<Props> = ({ image, zoom = 3 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) {
      return;
    }

    const imageData = ctx.createImageData(image.width, image.height);
    const destView = new DataView(imageData.data.buffer);
    const srcView = new DataView(
      image.data.buffer,
      image.data.byteOffset,
      image.data.byteLength
    );

    for (let i = 0; i < image.width * image.height; i += 1) {
      const value = srcView.getUint8(i);
      destView.setUint8(i * 4, value);
      destView.setUint8(i * 4 + 1, value);
      destView.setUint8(i * 4 + 2, value);
      destView.setUint8(i * 4 + 3, 255);
    }

    ctx.putImageData(imageData, 0, 0);
  }, [image]);

  return (
    <canvas
      ref={canvasRef}
      width={image.width}
      height={image.height}
      style={{
        width: image.width * zoom,
        height: image.height * zoom,
        imageRendering: "pixelated",
        border: "1px solid var(--ant-border-color-base)",
      }}
    />
  );
};

export default SplashPreviewCanvas;
