import { Form, Select } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";

type FormItem = {
  selectedId?: string;
  available?: { id: string; name: string }[];
  loading?: boolean;
  error?: boolean;
  tooltip?: string;
  placeholder?: string;
};

type Props = {
  releases: FormItem;
  disabled?: boolean;
};

const CloudVersionTargetForm: React.FC<Props> = ({ releases, disabled }) => {
  const { t } = useTranslation("flashing");
  return (
    <Form layout="vertical" size="large">
      <Form.Item label={t(`Firmware version`)} name="version" required>
        <Select
          allowClear={false}
          placeholder={
            releases.loading
              ? t(`Loading releases...`)
              : releases.placeholder ?? t(`Select firmware version`)
          }
          loading={releases.loading}
          virtual={process.env.NODE_ENV !== "test"}
          disabled={!!releases.error || disabled}
        >
          {releases.available?.map((r) => (
            <Select.Option key={r.id} value={r.id}>
              {r.name}
            </Select.Option>
          ))}
        </Select>
      </Form.Item>
    </Form>
  );
};

export default CloudVersionTargetForm;
