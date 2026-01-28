import React, { useState } from "react";
import {
  Modal,
  List,
  Input,
  Button,
  Typography,
  Space,
  Tooltip,
  message,
} from "antd";
import {
  WarningOutlined,
  EditOutlined,
  ThunderboltOutlined,
  EyeOutlined,
} from "@ant-design/icons";
import { useTranslation } from "react-i18next";

type CollisionInfo = {
  fileName: string;
  displayName: string;
  existingContent: string;
  backupContent: string;
};

type CollisionModalProps = {
  visible: boolean;
  collisions: CollisionInfo[];
  availableSlots: string[];
  onCancel: () => void;
  onResolve: (renames: Record<string, string>, overwrite: boolean) => void;
  onViewDiff: (collision: CollisionInfo) => void;
};

const CollisionModal: React.FC<CollisionModalProps> = ({
  visible,
  collisions,
  availableSlots,
  onCancel,
  onResolve,
  onViewDiff,
}) => {
  const { t } = useTranslation("backup");
  const [renames, setRenames] = useState<Record<string, string>>({});
  const [editingModel, setEditingModel] = useState<string | null>(null);

  const handleAutoRename = (): void => {
    if (availableSlots.length < collisions.length) {
      void message.warning(t(`Not enough available slots for all models`));
      return;
    }

    const newRenames: Record<string, string> = {};
    collisions.forEach((collision, index) => {
      const slot = availableSlots[index];
      if (slot) {
        newRenames[collision.fileName] = slot;
      }
    });
    setRenames(newRenames);
    void message.success(t(`Auto-rename applied`));
  };

  const handleRename = (oldName: string, newName: string): void => {
    setRenames((prev) => ({
      ...prev,
      [oldName]: newName,
    }));
  };

  const handleOverwriteAll = (): void => {
    onResolve({}, true);
  };

  const handleRestoreWithRenames = (): void => {
    // Check if all collisions are resolved
    const unresolvedCollisions = collisions.filter((c) => !renames[c.fileName]);

    if (unresolvedCollisions.length > 0) {
      void message.warning(
        t(`Please rename or overwrite all conflicting models`)
      );
      return;
    }

    onResolve(renames, false);
  };

  return (
    <Modal
      title={
        <Space>
          <WarningOutlined style={{ color: "#faad14" }} />
          <span>{t(`Model name conflicts detected`)}</span>
        </Space>
      }
      visible={visible}
      onCancel={onCancel}
      width={700}
      footer={[
        <Button key="cancel" onClick={onCancel}>
          {t(`Cancel`)}
        </Button>,
        <Button
          key="auto"
          icon={<ThunderboltOutlined />}
          onClick={handleAutoRename}
          disabled={availableSlots.length < collisions.length}
        >
          {t(`Auto-rename all`)}
        </Button>,
        <Button
          key="overwrite"
          type="primary"
          danger
          onClick={handleOverwriteAll}
        >
          {t(`Overwrite all`)}
        </Button>,
        <Button
          key="restore"
          type="primary"
          onClick={handleRestoreWithRenames}
          disabled={collisions.some((c) => !renames[c.fileName])}
        >
          {t(`Restore with renames`)}
        </Button>,
      ]}
    >
      <Typography.Paragraph>
        {t(
          `The following models already exist on your SD card. Choose how to handle each conflict:`
        )}
      </Typography.Paragraph>

      <List
        dataSource={collisions}
        renderItem={(collision) => {
          const newName = renames[collision.fileName];
          const isEditing = editingModel === collision.fileName;

          let renameContent: React.ReactNode;
          if (isEditing) {
            renameContent = (
              <Input
                size="small"
                placeholder={t(`New file name (without .yml)`)}
                value={newName ?? ""}
                onChange={(e) =>
                  handleRename(collision.fileName, e.target.value)
                }
                suffix=".yml"
              />
            );
          } else if (newName) {
            renameContent = (
              <Typography.Text type="secondary">
                {collision.fileName}.yml → {newName}.yml
              </Typography.Text>
            );
          } else {
            renameContent = (
              <Typography.Text type="warning">
                {collision.fileName}.yml (
                {t(`will be overwritten if you choose "Overwrite all"`)})
              </Typography.Text>
            );
          }

          return (
            <List.Item
              actions={[
                <Tooltip title={t(`View differences`)}>
                  <Button
                    icon={<EyeOutlined />}
                    size="small"
                    onClick={() => onViewDiff(collision)}
                  />
                </Tooltip>,
                isEditing ? (
                  <Button
                    size="small"
                    type="primary"
                    onClick={() => setEditingModel(null)}
                  >
                    {t(`Done`)}
                  </Button>
                ) : (
                  <Tooltip title={t(`Rename model`)}>
                    <Button
                      icon={<EditOutlined />}
                      size="small"
                      onClick={() => setEditingModel(collision.fileName)}
                    />
                  </Tooltip>
                ),
              ]}
            >
              <List.Item.Meta
                title={
                  <Space direction="vertical" style={{ width: "100%" }}>
                    <Typography.Text strong>
                      {collision.displayName}
                    </Typography.Text>
                    {renameContent}
                  </Space>
                }
              />
            </List.Item>
          );
        }}
      />

      {availableSlots.length > 0 && (
        <Typography.Paragraph type="secondary" style={{ marginTop: 16 }}>
          {t(`Available slots`)}: {availableSlots.slice(0, 5).join(", ")}
          {availableSlots.length > 5 &&
            ` +${availableSlots.length - 5} ${t(`more`)}`}
        </Typography.Paragraph>
      )}
    </Modal>
  );
};

export default CollisionModal;
