// src/renderer/pages/sdcard/editor/tabs/RestoreTab.tsx
import React, { useState, useEffect } from "react";
import {
  Upload,
  Button,
  Table,
  Select,
  Spin,
  Alert,
  Space,
  Typography,
  Checkbox,
  message,
} from "antd";
import type { ColumnType } from "antd/lib/table";
import type { RcFile, UploadProps } from "antd/lib/upload";
import JSZip from "jszip";
import { useQuery, useMutation } from "@apollo/client";
import {
  SD_CARD_DIRECTORY_INFO,
  GENERATE_RESTORE_PLAN,
  CreateRestorePlanData,
  CreateRestorePlanVars,
  CREATE_SDCARD_RESTORE_JOB,
  CreateSdcardRestoreJobData,
  CreateSdcardRestoreJobVars,
} from "renderer/pages/sdcard/editor/sdcard.gql";
import JobExecutionModal from "renderer/pages/sdcard/editor/JobExecutionModal";

const { Title, Paragraph, Text } = Typography;
const { Option } = Select;

type ConflictRow = {
  key: string;
  path: string;
  incomingSize: number;
  existingSize: number;
  action: "OVERWRITE" | "SKIP" | "RENAME";
};

type RestoreTabProps = {
  directoryId: string;
  assetType: "MODELS" | "THEMES" | "RADIO";
  // eslint-disable-next-line react/no-unused-prop-types
  selected: string[]; // (we ignore this here, since the ZIP itself determines what to restore)
};

const RestoreTab: React.FC<RestoreTabProps> = ({ directoryId, assetType }) => {
  // ensure SD-card handle is valid
  const { loading: infoLoading, error: infoError } = useQuery(
    SD_CARD_DIRECTORY_INFO,
    { variables: { directoryId } }
  );

  // file + zip state
  const [file, setFile] = useState<RcFile | null>(null);
  const [zipDataUrl, setZipDataUrl] = useState<string>();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [paths, setPaths] = useState<string[]>([]);

  // flow state
  const [phase, setPhase] = useState<"select" | "plan" | "execute">("select");
  const [plan, setPlan] =
    useState<CreateRestorePlanData["generateRestorePlan"]>();
  const [resolutions, setResolutions] = useState<
    { path: string; action: ConflictRow["action"] }[]
  >([]);
  const [overwrite, setOverwrite] = useState(false);
  const [autoRename, setAutoRename] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);

  // Generate the restore plan
  const [runPlan, { loading: planning }] = useMutation<
    CreateRestorePlanData,
    CreateRestorePlanVars
  >(GENERATE_RESTORE_PLAN, {
    onCompleted(data) {
      setPlan(data.generateRestorePlan);
      setResolutions(
        data.generateRestorePlan.conflicts.map((c) => ({
          path: c.path,
          action: "SKIP" as const,
        }))
      );
    },
    onError(err) {
      void message.error(err.message);
      setPhase("select");
      setFile(null);
      setPaths([]);
    },
  });

  // Fire plan as soon as we've unpacked the zip
  useEffect(() => {
    if (zipDataUrl && phase === "select" && !planning) {
      setPhase("plan");
      void runPlan({
        variables: {
          directoryId,
          zipData: zipDataUrl,
        },
      });
    }
  }, [zipDataUrl, phase, planning, runPlan, directoryId]);

  // Create the restore job
  const [runRestore, { loading: restoring }] = useMutation<
    CreateSdcardRestoreJobData,
    CreateSdcardRestoreJobVars
  >(CREATE_SDCARD_RESTORE_JOB, {
    onCompleted(data) {
      setJobId(data.createSdcardRestoreJob.id);
      setPhase("execute");
    },
    onError(err) {
      void message.error(err.message);
    },
  });

  // handle file selection
  const handleBeforeUpload: UploadProps["beforeUpload"] = (f) => {
    setFile(f);
    // read Data URL for sending
    const reader = new FileReader();
    reader.onload = (e) => {
      const url = e.target?.result;
      if (typeof url === "string") setZipDataUrl(url);
    };
    reader.readAsDataURL(f);

    // unpack for plan
    f.arrayBuffer()
      .then((buf) => new JSZip().loadAsync(buf))
      .then((zip) => {
        const entryNames = Object.values(zip.files)
          .filter((ent) => !ent.dir)
          .map((ent) => ent.name);
        setPaths(entryNames);
      })
      .catch((err: unknown) => {
        // narrow down to Error or string – avoids `any` in template literal
        const msg = err instanceof Error ? err.message : String(err);
        void message.error(`Failed to read ZIP: ${msg}`);
      });

    return false; // prevent auto‐upload
  };

  // column defs for conflicts
  const conflictCols: ColumnType<ConflictRow>[] = [
    { title: "Path", dataIndex: "path", key: "path" },
    {
      title: "Incoming",
      dataIndex: "incomingSize",
      key: "incomingSize",
      render: (n: number) => `${n} bytes`,
    },
    {
      title: "Existing",
      dataIndex: "existingSize",
      key: "existingSize",
      render: (n: number) => `${n} bytes`,
    },
    {
      title: "Action",
      key: "action",
      render: (_: unknown, rec: ConflictRow) => (
        <Select<ConflictRow["action"]>
          value={rec.action}
          onChange={(val) =>
            setResolutions((prev) =>
              prev.map((r) => (r.path === rec.path ? { ...r, action: val } : r))
            )
          }
          style={{ width: 120 }}
        >
          <Option value="OVERWRITE">Overwrite</Option>
          <Option value="SKIP">Skip</Option>
          <Option value="RENAME">Rename</Option>
        </Select>
      ),
    },
  ];

  // reset helper after completion/cancel
  const resetAll = (): void => {
    setPhase("select");
    setFile(null);
    setZipDataUrl(undefined);
    setPaths([]);
    setPlan(undefined);
    setResolutions([]);
    setOverwrite(false);
    setAutoRename(false);
    setJobId(null);
  };

  if (infoLoading) return <Spin style={{ margin: 40 }} />;
  if (infoError) return <Alert type="error" message={infoError.message} />;

  // 1) File‐select stage
  if (phase === "select") {
    return (
      <Space
        direction="vertical"
        style={{ width: "100%", textAlign: "center", marginTop: 40 }}
      >
        <Upload
          beforeUpload={handleBeforeUpload}
          showUploadList={false}
          accept=".zip,.etx"
          maxCount={1}
        >
          <Button>Select Backup ZIP or ETX</Button>
        </Upload>
        {file && <Text>Selected file: {file.name}</Text>}
      </Space>
    );
  }

  // 2) Planning stage
  if (phase === "plan" && !plan) {
    return (
      <Space
        direction="vertical"
        style={{ width: "100%", textAlign: "center", marginTop: 40 }}
      >
        <Spin size="large" />
        <Text>Generating restore plan…</Text>
      </Space>
    );
  }

  // 3) Show plan & conflict resolution
  if (phase === "plan" && plan) {
    const rows: ConflictRow[] = plan.conflicts.map((c) => ({
      key: c.path,
      path: c.path,
      incomingSize: c.incomingSize,
      existingSize: c.existingSize,
      action: resolutions.find((r) => r.path === c.path)?.action ?? "SKIP",
    }));

    return (
      <Space direction="vertical" style={{ width: "100%" }}>
        <Title level={4}>{assetType} Restore Plan</Title>

        <Paragraph>
          <strong>To Restore ({plan.toCopy.length})</strong>
          <br />
          {plan.toCopy.map((p) => (
            <div key={p}>{p}</div>
          ))}
        </Paragraph>

        <Paragraph>
          <strong>Identical ({plan.identical.length})</strong>
          <br />
          {plan.identical.map((p) => (
            <div key={p}>{p}</div>
          ))}
        </Paragraph>

        {rows.length > 0 ? (
          <>
            <Paragraph>
              <strong>Conflicts</strong>
            </Paragraph>
            <Table<ConflictRow>
              dataSource={rows}
              columns={conflictCols}
              pagination={false}
              size="small"
            />
          </>
        ) : (
          <Alert type="info" message="No conflicts detected." />
        )}

        <Space style={{ marginTop: 16 }}>
          <Checkbox
            checked={overwrite}
            onChange={(e) => setOverwrite(e.target.checked)}
          >
            Overwrite existing files
          </Checkbox>
          <Checkbox
            checked={autoRename}
            onChange={(e) => setAutoRename(e.target.checked)}
          >
            Auto rename files if conflict
          </Checkbox>
        </Space>

        <Space style={{ marginTop: 16 }}>
          <Button
            type="primary"
            loading={restoring}
            disabled={!zipDataUrl || restoring}
            onClick={() => {
              void runRestore({
                variables: {
                  directoryId,
                  zipData: zipDataUrl!,
                  options: {
                    conflictResolutions: { items: resolutions },
                    overwrite,
                    autoRename,
                  },
                },
              });
            }}
          >
            Confirm & Run Restore
          </Button>
        </Space>
      </Space>
    );
  }

  // 4) Execute stage
  if (phase === "execute") {
    if (!jobId) return <Spin style={{ margin: 40 }} />;

    return (
      <JobExecutionModal
        jobId={jobId}
        onCompleted={() => {
          void message.success("Restore completed");
          resetAll();
        }}
        onCancelled={() => {
          void message.warning("Restore cancelled");
          resetAll();
        }}
      />
    );
  }

  return null;
};

export default RestoreTab;
