import React from "react";
import { fireEvent, render as origRender } from "@testing-library/react";
import AntProvider from "renderer/AntProvider";
import { I18nextProvider } from "react-i18next";
import i18n from "./i18n";

export const render = (children: React.ReactNode) => {
  const result = origRender(
    <I18nextProvider i18n={i18n}>
      <AntProvider>{children}</AntProvider>)
    </I18nextProvider>
  );
  return {
    ...result,
    rerender: (c: React.ReactNode) =>
      result.rerender(
        <I18nextProvider i18n={i18n}>
          <AntProvider>{c}</AntProvider>
        </I18nextProvider>
      ),
  };
};

export const openAntDropdown = (element: HTMLElement) => {
  fireEvent.keyDown(element, {
    key: "Enter",
    code: 13,
    charCode: 13,
  });
};
