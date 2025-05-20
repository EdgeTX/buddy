// renderer/pages/sdcard/editor/tabs/BackupTab.tsx
import React, { useState } from "react";
import { useMutation, useQuery } from "@apollo/client";
import {
  Button,
  Table,
  Select,
  Alert,
  Spin,
  Typography,
  Space,
  message,
} from "antd";
import type { ColumnType } from "antd/lib/table";

import {
  SD_CARD_DIRECTORY_INFO,
  GENERATE_BACKUP_PLAN,
  ExecuteBackupVars,
  ExecuteBackupData as ExecuteBackupDataGQL,
  GenerateBackupPlanData,
  GenerateBackupPlanVars,
  EXPORT_BACKUP_TO_ZIP,
  ExportBackupToZipData,
  ExportBackupToZipVars,
  SdcardAssetsDirectoryInfoData,
  SdcardAssetsDirectoryInfoVars,
  EXECUTE_BACKUP,
} from "renderer/pages/sdcard/editor/sdcard.gql";
import JobExecutionModal from "renderer/pages/sdcard/editor/JobExecutionModal";

const { Paragraph, Title } = Typography;
const { Option } = Select;

type ConflictRow = {
  key: string;
  path: string;
  incomingSize: number;
  existingSize: number;
  action: "OVERWRITE" | "SKIP" | "RENAME";
};

type BackupTabProps = {
  directoryId: string;
  selected: string[];
  assetType: "MODELS" | "THEMES" | "RADIO";
};

const BackupTab: React.FC<BackupTabProps> = ({
  directoryId,
  selected,
  assetType,
}) => {
  // same `useQuery` to fetch the directory handle…
  const {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    data: dirInfo,
    loading: infoLoading,
    error: infoError,
  } = useQuery<SdcardAssetsDirectoryInfoData, SdcardAssetsDirectoryInfoVars>(
    SD_CARD_DIRECTORY_INFO,
    {
      variables: { directoryId },
    }
  );

  // phase, plan, resolutions, jobId…
  const [phase, setPhase] = useState<"plan" | "execute">("plan");
  const [plan, setPlan] =
    useState<GenerateBackupPlanData["generateBackupPlan"]>();
  const [resolutions, setResolutions] = useState<
    { path: string; action: ConflictRow["action"] }[]
  >([]);
  const [jobId, setJobId] = useState<string | null>(null);

  // generate plan
  const [runPlan, { loading: planning }] = useMutation<
    GenerateBackupPlanData,
    GenerateBackupPlanVars
  >(GENERATE_BACKUP_PLAN, {
    variables: {
      directoryId,
      paths: { paths: selected.map((name) => `${assetType}/${name}`) },
      direction: "TO_LOCAL",
    },
    onError(err) {
      void message.error(err.message);
    },
    onCompleted(data) {
      setPlan(data.generateBackupPlan);
      setResolutions(
        data.generateBackupPlan.conflicts.map((c) => ({
          path: c.path,
          action: "SKIP" as const,
        }))
      );
    },
  });

  // ─── auto‐run plan on mount ───────────────────────────────────────────────
  React.useEffect(() => {
    if (selected.length > 0 && phase === "plan" && !plan && !planning) {
      void runPlan();
    }
    // we only want this to run once when the modal opens
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // execute
  const [runExec, { loading: executing }] = useMutation<
    ExecuteBackupDataGQL,
    ExecuteBackupVars
  >(EXECUTE_BACKUP, {
    onError(err) {
      void message.error(err.message);
    },
    onCompleted(data) {
      setJobId(data.executeBackup.id);
      setPhase("execute");
    },
  });

  // export
  const [exportZip] = useMutation<ExportBackupToZipData, ExportBackupToZipVars>(
    EXPORT_BACKUP_TO_ZIP,
    {
      onError(err) {
        void message.error(err.message);
      },
    }
  );

  // conflict table columns
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

  if (infoLoading) return <Spin style={{ margin: 40 }} />;
  if (infoError) return <Alert type="error" message={infoError.message} />;

  // while the plan is coming back, show a spinner/message:
  if (phase === "plan" && !plan) {
    return (
      <Space
        direction="vertical"
        style={{ width: "100%", textAlign: "center", marginTop: 40 }}
      >
        <Spin size="large" />
        <Typography.Text>
          Generating <strong>{assetType}</strong> backup plan…
        </Typography.Text>
      </Space>
    );
  }

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
        <Title level={4}>{assetType} Backup Plan</Title>
        <Paragraph>
          <strong>To Copy ({plan.toCopy.length})</strong>
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
        <Button
          type="primary"
          onClick={() =>
            void runExec({
              variables: {
                directoryId,
                paths: { paths: selected.map((n) => `${assetType}/${n}`) },
                direction: "TO_LOCAL",
                conflictResolutions: { items: resolutions },
              },
            })
          }
          disabled={executing}
          loading={executing}
          style={{ marginTop: 16 }}
        >
          Confirm &amp; Run Backup
        </Button>
        <Button
          style={{ marginLeft: 8 }}
          onClick={async () => {
            const { data } = await exportZip({
              variables: {
                directoryId,
                paths: { paths: selected.map((n) => `${assetType}/${n}`) },
              },
            });
            if (data?.exportBackupToZip) {
              const link = document.createElement("a");
              link.href = data.exportBackupToZip;
              link.download = `edgetx-${assetType.toLowerCase()}-backup-${Date.now()}.zip`;
              link.click();
            }
          }}
        >
          Export .zip
        </Button>
      </Space>
    );
  }

  // EXECUTE phase: must always return something
  if (phase === "execute") {
    // still waiting for the mutation to return its jobId?
    if (!jobId) {
      return <Spin style={{ margin: 40 }} />;
    }

    return (
      <JobExecutionModal
        jobId={jobId}
        onCompleted={() => {
          void message.success("Backup completed");
          setPhase("plan");
          setPlan(undefined);
          setJobId(null);
        }}
        onCancelled={() => {
          void message.warning("Backup cancelled");
          setPhase("plan");
          setPlan(undefined);
          setJobId(null);
        }}
      />
    );
  }

  // (Should never reach here – but TS wants a return on every path)
  return null;
};

export default BackupTab;
