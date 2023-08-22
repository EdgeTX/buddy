import { Form, Select } from "antd";
import React from "react";
import { useTranslation } from "react-i18next";

type Props = {};

const CloudVersionTargetForm: React.FC<Props> = ({}) => {
  const { t } = useTranslation("flashing");
  return (
    <Form layout="vertical" size="large">
      <Form.Item label={t(`Firmware version`)} name="version" required>
        <Select
          allowClear={false}
          placeholder={t(`Loading releases...`)}
        ></Select>
      </Form.Item>
    </Form>
  );
};

export default CloudVersionTargetForm;
