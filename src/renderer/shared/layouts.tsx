import styled from "styled-components";

export const Centered = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  min-height: 0;
`;

export const FullHeight = styled.div`
  height: 100%;
  display: flex;
  flex-direction: column;
  min-height: 0;
`;

export const FullHeightCentered = styled(FullHeight)`
  justify-content: center;
`;
