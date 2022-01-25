import styled, { css } from "styled-components";
import { List } from "antd";

const SelectableItemList = styled(List.Item)`
  background-color: ${(props) =>
    props["aria-selected"]
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
