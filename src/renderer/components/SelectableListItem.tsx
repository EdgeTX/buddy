import styled, { css } from "styled-components";
import { List } from "antd";
import React from "react";

type ListItemWithSelectable = React.FC<
  { selected: boolean } & Parameters<typeof List.Item>[0]
>;
const SelectableItemList = styled(List.Item as ListItemWithSelectable)`
  background-color: ${({ selected }) =>
    selected
      ? css`
         var(--ant-primary-1)
        `
      : undefined};

  :hover {
    cursor: pointer;
    background-color: var(--ant-primary-1);
  }
`;

export default SelectableItemList;
