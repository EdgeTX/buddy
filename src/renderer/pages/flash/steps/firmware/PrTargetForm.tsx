import { InfoCircleOutlined } from "@ant-design/icons";
import { Form, Select } from "antd";
import React from "react";

type FormItem = {
  selectedId?: string;
  available: { id: string; name?: string }[] | null;
  loading?: boolean;
  error?: boolean;
  tooltip?: string;
  placeholder?: string;
};

type Props = {
  onChanged: (values: {
    pullRequest?: string;
    commit?: string;
    target?: string;
  }) => void;
  disabled?: boolean;
  targets: FormItem;
  pullRequests: FormItem;
  commits: FormItem;
};

const PrTargetForm: React.FC<Props> = ({
  onChanged,
  pullRequests,
  commits,
  targets,
  disabled,
}) => (
  <Form
    layout="vertical"
    onValuesChange={(_, values) =>
      onChanged({ ...values } as Parameters<typeof onChanged>[0])
    }
    fields={Object.entries({
      target: targets.selectedId,
      version: pullRequests.selectedId,
    }).map(([key, value]) => ({ name: [key], value }))}
    size="large"
  >
    <Form.Item
      label="Pull request"
      name="pullRequest"
      tooltip={
        pullRequests.tooltip
          ? {
              title: pullRequests.tooltip,
              icon: <InfoCircleOutlined />,
            }
          : pullRequests.tooltip
      }
      help={pullRequests.error ? "Could not load pull requests" : null}
      validateStatus={pullRequests.error ? "error" : undefined}
      required
    >
      <Select
        value={pullRequests.selectedId}
        allowClear={false}
        placeholder={
          pullRequests.loading
            ? "Loading pull requests..."
            : pullRequests.placeholder ?? "Select pull request"
        }
        loading={pullRequests.loading}
        disabled={!!pullRequests.error || disabled}
      >
        {pullRequests.available?.map((pr) => (
          <Select.Option key={pr.id} value={pr.id}>
            {pr.name ?? pr.id}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
    <Form.Item
      label="Commits"
      name="commit"
      tooltip={
        commits.tooltip
          ? {
              title: commits.tooltip,
              icon: <InfoCircleOutlined />,
            }
          : commits.tooltip
      }
      help={commits.error ? "Could not load commits" : null}
      validateStatus={commits.error ? "error" : undefined}
      required
    >
      <Select
        value={commits.selectedId}
        allowClear={false}
        placeholder={
          commits.loading
            ? "Loading commits..."
            : commits.placeholder ?? "Select build"
        }
        loading={commits.loading}
        disabled={!!commits.error || disabled}
      >
        {commits.available?.map((c) => (
          <Select.Option key={c.id} value={c.id}>
            {c.name ?? c.id}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
    <Form.Item
      label="Radio model"
      name="target"
      tooltip={
        targets.tooltip
          ? {
              title: "The type of radio you want to flash",
              icon: <InfoCircleOutlined />,
            }
          : undefined
      }
      help={targets.error ? "Could not load targets" : undefined}
      required
      validateStatus={targets.error ? "error" : undefined}
    >
      <Select
        value={targets.selectedId}
        allowClear={false}
        loading={targets.loading}
        disabled={
          !commits.selectedId ||
          !!targets.error ||
          !!targets.loading ||
          disabled
        }
        placeholder={
          !commits.selectedId
            ? "Select commit to see available models"
            : targets.placeholder ?? "Select radio model"
        }
      >
        {targets.available?.map((t) => (
          <Select.Option key={t.id} value={t.id}>
            {t.name ?? t.id}
          </Select.Option>
        ))}
      </Select>
    </Form.Item>
  </Form>
);

export default PrTargetForm;
