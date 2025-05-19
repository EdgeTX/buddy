// src/renderer/pages/sdcard/editor/tabs/RestoreTab.tsx
import React, { useState, useEffect, useRef } from "react";
import {
  Upload,
  Button,
  Select,
  Progress,
  Alert,
  Typography,
  Space,
} from "antd";
import { RcFile } from "antd/lib/upload";
import JSZip from "jszip";
import DiffViewer from "react-diff-viewer-continued";
import { useMutation } from "@apollo/client";
import {
  GENERATE_BACKUP_PLAN,
  GenerateBackupPlanData,
  GenerateBackupPlanVars,
  RESTORE_FROM_ZIP,
  RestoreFromZipData,
  RestoreFromZipVars,
} from "renderer/pages/sdcard/editor/sdcard.gql";

const { Title, Text } = Typography;

export type ConflictRow = {
  key: string;
  path: string;
  incomingContent: string;
  existingContent: string;
};

type AssetType = "MODELS" | "THEMES" | "RADIO";

type RestoreTabProps = {
  directoryId: string;
  assetType: AssetType;
  selected: string[];
};

const RestoreTab: React.FC<RestoreTabProps> = ({
  directoryId,
  assetType,
  selected,
}) => {
  // Accumulate directory uploads
  const pickedFiles = useRef<(File & { webkitRelativePath?: string })[]>([]);

  const [zipBlob, setZipBlob] = useState<Blob | null>(null);
  const [zipInstance, setZipInstance] = useState<JSZip | null>(null);
  const [conflicts, setConflicts] = useState<ConflictRow[]>([]);
  const [resolutions, setResolutions] = useState<
    Record<string, "OVERWRITE" | "SKIP" | "RENAME">
  >({});
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // 1) Plan-mutation
  const [generatePlan, { data: planData, loading: planning }] = useMutation<
    GenerateBackupPlanData,
    GenerateBackupPlanVars
  >(GENERATE_BACKUP_PLAN);

  // 2) Restore-mutation
  const [restoreZip, { loading: restoring }] = useMutation<
    RestoreFromZipData,
    RestoreFromZipVars
  >(RESTORE_FROM_ZIP, {
    onError: (e) => setError(e.message),
    onCompleted: () => setProgress(100),
  });

  // Build diffs when we have both a ZIP and a plan
  useEffect(() => {
    if (!planData || !zipInstance) return;
    void (async () => {
      const rows: ConflictRow[] = await Promise.all(
        planData.generateBackupPlan.conflicts.map(async (c) => {
          const ze = zipInstance.file(c.path);
          const incoming = ze ? await ze.async("string") : "";
          // TODO: read existing content from FS via showDirectoryPicker
          const existing = "";
          return {
            key: c.path,
            path: c.path,
            incomingContent: incoming,
            existingContent: existing,
          };
        })
      );
      setConflicts(rows);
      setResolutions(
        rows.reduce<Record<string, "OVERWRITE" | "SKIP" | "RENAME">>(
          (acc, r) => ({ ...acc, [r.key]: "SKIP" }),
          {}
        )
      );
    })();
  }, [planData, zipInstance]);

  // Handle both ZIP files and directory uploads
  const handleUpload = async (file: RcFile): Promise<boolean> => {
    const fileWithPath = file as unknown as File & {
      webkitRelativePath?: string;
    };
    let blob: Blob;
    let zip: JSZip;

    if (/\.(zip|etx)$/i.test(fileWithPath.name)) {
      // Dropped a .zip or .etx
      blob = fileWithPath;
      zip = await JSZip.loadAsync(blob);
    } else {
      // Directory upload: accumulate and re-zip
      pickedFiles.current.push(fileWithPath);
      const z = new JSZip();
      pickedFiles.current.forEach((f) => {
        const path = f.webkitRelativePath;
        z.file(path, f);
      });
      blob = await z.generateAsync({ type: "blob" });
      zip = await JSZip.loadAsync(blob);
    }

    setZipBlob(blob);
    setZipInstance(zip);

    const allPaths = Object.keys(zip.files).filter((p) => !zip.files[p]!.dir);
    const filtered = allPaths.filter((p) => {
      const [, name] = p.split(`${assetType}/`);
      return !!name && selected.includes(name);
    });

    await generatePlan({
      variables: {
        directoryId,
        paths: { paths: filtered },
        direction: "TO_SDCARD",
      },
    });

    // Prevent antd from auto-uploading
    return false;
  };

  // Perform the restore when confirmed
  const handleRestore = (): void => {
    if (!zipBlob) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const items = conflicts.map((r) => ({
        path: r.path,
        action: resolutions[r.key]!,
      }));
      void restoreZip({
        variables: {
          directoryId,
          zipData: dataUrl,
          conflictResolutions: { items },
        },
      });
    };
    reader.readAsDataURL(zipBlob);
  };

  return (
    <Space direction="vertical" style={{ width: "100%" }}>
      {/* two buttons: one for ZIP/.etx, one for folders */}
      <Space wrap>
        <Upload
          accept=".zip,.etx"
          beforeUpload={handleUpload}
          showUploadList={false}
        >
          <Button>Pick a .zip or .etx</Button>
        </Upload>

        <Upload
          multiple
          directory
          beforeUpload={handleUpload}
          showUploadList={false}
        >
          <Button>Pick a folder</Button>
        </Upload>
      </Space>

      {planning && <Progress percent={50} status="active" />}

      {conflicts.length > 0 && (
        <>
          <Title level={4}>Conflicts & Diff Preview</Title>
          {conflicts.map((row) => (
            <div key={row.key} style={{ marginBottom: 24 }}>
              <Text strong>{row.path}</Text>
              <DiffViewer
                oldValue={row.existingContent}
                newValue={row.incomingContent}
              />
              <Select<"OVERWRITE" | "SKIP" | "RENAME">
                value={resolutions[row.key]}
                onChange={(v) =>
                  setResolutions((prev) => ({ ...prev, [row.key]: v }))
                }
                style={{ width: 120, marginTop: 8 }}
              >
                <Select.Option value="OVERWRITE">Overwrite</Select.Option>
                <Select.Option value="SKIP">Skip</Select.Option>
                <Select.Option value="RENAME">Rename</Select.Option>
              </Select>
            </div>
          ))}
        </>
      )}

      <Button
        type="primary"
        disabled={!zipBlob || planning || restoring}
        onClick={handleRestore}
      >
        Confirm & Restore {assetType}
      </Button>

      {restoring && (
        <Progress percent={progress} status={error ? "exception" : "active"} />
      )}
      {error && <Alert type="error" message={error} />}
    </Space>
  );
};

export default RestoreTab;
