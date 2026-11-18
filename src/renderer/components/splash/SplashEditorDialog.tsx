import React, { useMemo, useState } from "react";
import {
  Modal,
  Button,
  Space,
  Radio,
  Checkbox,
  Typography,
  Alert,
  Spin,
  message,
} from "antd";
import type { RadioChangeEvent } from "antd";
import type { CheckboxChangeEvent } from "antd/lib/checkbox";
import { gql, useMutation, useQuery } from "@apollo/client";
import * as base64ArrayBuffer from "base64-arraybuffer";
import { useTranslation } from "react-i18next";
import { DitherAlgorithm, GrayscaleImage } from "shared/splash";
import saveFirmwareFile from "renderer/components/firmware/saveFirmwareFile";
import { Centered } from "renderer/shared/layouts";
import SplashUploadArea from "./SplashUploadArea";
import SplashPreviewCanvas from "./SplashPreviewCanvas";
import {
  processSplashImage,
  FitMode,
  SplashCapability,
} from "./imageProcessing";

type Props = {
  /** A real, already-registered local firmware id. */
  target: string;
  /** Only true when opened from the Local file tab, where the original
   * upload is retained on disk and re-selecting it is trivial - for
   * GitHub/CloudBuild origins, "applying" would silently overwrite the
   * originally selected release/target with no easy way back. */
  allowApplyAndContinue: boolean;
  onClose: () => void;
  onApplied: (patchedFirmwareId: string) => void;
};

const SplashEditorDialog: React.FC<Props> = ({
  target,
  allowApplyAndContinue,
  onClose,
  onApplied,
}) => {
  const { t } = useTranslation("flashing");
  const [image, setImage] = useState<{ bitmap: ImageBitmap; name: string }>();
  const [fitMode, setFitMode] = useState<FitMode>("letterbox");
  const [algorithm, setAlgorithm] =
    useState<DitherAlgorithm>("floyd-steinberg");
  const [invert, setInvert] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data, loading: capabilityLoading } = useQuery(
    gql(/* GraphQL */ `
      query SplashEditorFirmwareInfo($firmwareId: ID!) {
        firmwareSplashInfo(firmwareId: $firmwareId) {
          format
          width
          height
          maxBytes
          currentSplashBase64
        }
      }
    `),
    { variables: { firmwareId: target } }
  );
  const capability = data?.firmwareSplashInfo ?? undefined;

  const [patchFirmwareSplash] = useMutation(
    gql(/* GraphQL */ `
      mutation PatchFirmwareSplash(
        $firmwareId: ID!
        $packedSplashBase64: String!
      ) {
        patchFirmwareSplash(
          firmwareId: $firmwareId
          packedSplashBase64: $packedSplashBase64
        ) {
          id
          name
          base64Data
        }
      }
    `)
  );

  // Zoom needs to fit both formats inside the 720px modal: 128x64 mono at
  // 3x (384px) and 212x64 grayscale at 3x (636px) would blow out the
  // layout next to the side controls, so grayscale uses a smaller zoom.
  const previewZoom = capability?.format === "mono-128x64" ? 3 : 2;

  const result = useMemo(
    () =>
      image && capability
        ? processSplashImage(
            image.bitmap,
            {
              format: capability.format as SplashCapability["format"],
              width: capability.width,
              height: capability.height,
              maxBytes: capability.maxBytes,
            },
            { fitMode, algorithm, invert }
          )
        : undefined,
    [image, capability, fitMode, algorithm, invert]
  );

  const currentSplashImage: GrayscaleImage | undefined = useMemo(() => {
    if (!capability?.currentSplashBase64) {
      return undefined;
    }
    return {
      width: capability.width,
      height: capability.height,
      data: new Uint8Array(
        base64ArrayBuffer.decode(capability.currentSplashBase64)
      ),
    };
  }, [capability]);

  const applyPatch = async (): Promise<
    { id: string; name: string; base64Data: string } | undefined
  > => {
    if (!result?.packed) {
      return undefined;
    }
    setBusy(true);
    try {
      const response = await patchFirmwareSplash({
        variables: {
          firmwareId: target,
          packedSplashBase64: Buffer.from(result.packed).toString("base64"),
        },
      });
      const patched = response.data?.patchFirmwareSplash;
      return patched
        ? {
            id: patched.id.toString(),
            name: patched.name,
            base64Data: patched.base64Data,
          }
        : undefined;
    } finally {
      setBusy(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    const patched = await applyPatch().catch((e: Error) => {
      void message.error(e.message);
      return undefined;
    });
    if (patched) {
      const decoded = base64ArrayBuffer.decode(patched.base64Data);
      await saveFirmwareFile(
        patched.name || `${patched.id}.bin`,
        decoded,
        t(`Firmware data`)
      );
      void message.success(t(`Firmware file saved`));
      onClose();
    }
  };

  const handleApply = async (): Promise<void> => {
    const patched = await applyPatch().catch((e: Error) => {
      void message.error(e.message);
      return undefined;
    });
    if (patched) {
      onApplied(patched.id);
    }
  };

  const footer = !capability
    ? [
        <Button key="cancel" onClick={onClose}>
          {t(`Cancel`)}
        </Button>,
      ]
    : [
        <Button key="cancel" onClick={onClose}>
          {t(`Cancel`)}
        </Button>,
        <Button
          key="save"
          disabled={!result?.packed}
          loading={busy}
          onClick={() => {
            void handleSave();
          }}
        >
          {t(`Save patched firmware`)}
        </Button>,
        ...(allowApplyAndContinue
          ? [
              <Button
                key="apply"
                type="primary"
                disabled={!result?.packed}
                loading={busy}
                onClick={() => {
                  void handleApply();
                }}
              >
                {t(`Apply and continue`)}
              </Button>,
            ]
          : []),
      ];

  const renderBody = (): React.ReactNode => {
    if (capabilityLoading) {
      return (
        <Centered style={{ height: 200 }}>
          <Spin />
        </Centered>
      );
    }

    if (!capability) {
      return (
        <Alert
          type="error"
          showIcon
          message={t(`No embedded splash region found in this firmware`)}
        />
      );
    }

    if (!image) {
      return (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          {currentSplashImage && (
            <Space
              direction="vertical"
              align="center"
              style={{ width: "100%" }}
            >
              <Typography.Text type="secondary">
                {t(`Current splash screen`)}
              </Typography.Text>
              <SplashPreviewCanvas
                image={currentSplashImage}
                zoom={previewZoom}
              />
            </Space>
          )}
          <SplashUploadArea
            onImageSelected={(bitmap, name) => setImage({ bitmap, name })}
          />
        </Space>
      );
    }

    return (
      <Space direction="vertical" size="middle" style={{ width: "100%" }}>
        <Space align="start" size="large">
          {result && (
            <SplashPreviewCanvas image={result.dithered} zoom={previewZoom} />
          )}
          <Space direction="vertical">
            <Radio.Group
              value={algorithm}
              onChange={(e: RadioChangeEvent) => {
                setAlgorithm(e.target.value as "floyd-steinberg" | "threshold");
              }}
            >
              <Radio.Button value="floyd-steinberg">
                {t(`Dithered`)}
              </Radio.Button>
              <Radio.Button value="threshold">
                {t(`Plain threshold`)}
              </Radio.Button>
            </Radio.Group>
            <Radio.Group
              value={fitMode}
              onChange={(e: RadioChangeEvent) => {
                setFitMode(e.target.value as FitMode);
              }}
            >
              <Radio.Button value="letterbox">{t(`Fit`)}</Radio.Button>
              <Radio.Button value="crop">{t(`Fill`)}</Radio.Button>
            </Radio.Group>
            <Checkbox
              checked={invert}
              onChange={(e: CheckboxChangeEvent) => {
                setInvert(e.target.checked);
              }}
            >
              {t(`Invert`)}
            </Checkbox>
            <Button onClick={() => setImage(undefined)}>
              {t(`Change image`)}
            </Button>
          </Space>
        </Space>
        {capability.format === "grayscale-212x64" &&
          (result?.packError ? (
            <Alert type="error" showIcon message={result.packError} />
          ) : (
            <Typography.Text type="secondary">
              {t(`Compressed size: {{size}} / {{max}} bytes`, {
                size: result?.packed?.length ?? 0,
                max: capability.maxBytes,
              })}
            </Typography.Text>
          ))}
      </Space>
    );
  };

  return (
    <Modal
      title={t(`Edit splash screen`)}
      visible
      width={720}
      onCancel={onClose}
      footer={footer}
    >
      {renderBody()}
    </Modal>
  );
};

export default SplashEditorDialog;
