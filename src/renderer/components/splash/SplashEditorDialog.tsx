import React, { useMemo, useState } from "react";
import {
  Modal,
  Button,
  Space,
  Radio,
  Checkbox,
  Typography,
  Alert,
  message,
} from "antd";
import type { RadioChangeEvent } from "antd";
import type { CheckboxChangeEvent } from "antd/lib/checkbox";
import { gql, useMutation } from "@apollo/client";
import * as base64ArrayBuffer from "base64-arraybuffer";
import { useTranslation } from "react-i18next";
import { DitherAlgorithm } from "shared/splash";
import useFetchFirmwareData from "renderer/hooks/useFetchFirmwareData";
import useRegisterLocalFirmware from "renderer/hooks/useRegisterLocalFirmware";
import saveFirmwareFile from "renderer/components/firmware/saveFirmwareFile";
import SplashUploadArea from "./SplashUploadArea";
import SplashPreviewCanvas from "./SplashPreviewCanvas";
import {
  processSplashImage,
  FitMode,
  SplashCapability,
} from "./imageProcessing";

type Props = {
  version?: string;
  target?: string;
  isLocal: boolean;
  capability: SplashCapability;
  onClose: () => void;
  onApplied: (patchedFirmwareId: string) => void;
};

const SplashEditorDialog: React.FC<Props> = ({
  version,
  target,
  isLocal,
  capability,
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

  const { fetchFirmwareData } = useFetchFirmwareData();
  const { registerLocalFirmware } = useRegisterLocalFirmware();

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

  const result = useMemo(
    () =>
      image
        ? processSplashImage(image.bitmap, capability, {
            fitMode,
            algorithm,
            invert,
          })
        : undefined,
    [image, capability, fitMode, algorithm, invert]
  );

  const ensureFirmwareId = async (): Promise<string> => {
    if (isLocal) {
      if (!target) {
        throw new Error(t(`No firmware selected`));
      }
      return target;
    }
    if (!version || !target) {
      throw new Error(t(`No firmware selected`));
    }
    const data = await fetchFirmwareData(version, target);
    if (!data) {
      throw new Error(t(`Could not fetch firmware`));
    }
    const id = await registerLocalFirmware(
      `${target}-${version}.bin`,
      Buffer.from(data).toString("base64")
    );
    if (!id) {
      throw new Error(t(`Could not register firmware`));
    }
    return id;
  };

  const applyPatch = async (): Promise<
    { id: string; name: string; base64Data: string } | undefined
  > => {
    if (!result?.packed) {
      return undefined;
    }
    setBusy(true);
    try {
      const firmwareId = await ensureFirmwareId();
      const response = await patchFirmwareSplash({
        variables: {
          firmwareId,
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

  return (
    <Modal
      title={t(`Edit splash screen`)}
      visible
      width={720}
      onCancel={onClose}
      footer={[
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
      ]}
    >
      {!image ? (
        <SplashUploadArea
          onImageSelected={(bitmap, name) => setImage({ bitmap, name })}
        />
      ) : (
        <Space direction="vertical" size="middle" style={{ width: "100%" }}>
          <Space align="start" size="large">
            {result && <SplashPreviewCanvas image={result.dithered} zoom={3} />}
            <Space direction="vertical">
              <Radio.Group
                value={algorithm}
                onChange={(e: RadioChangeEvent) => {
                  setAlgorithm(
                    e.target.value as "floyd-steinberg" | "threshold"
                  );
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
      )}
    </Modal>
  );
};

export default SplashEditorDialog;
