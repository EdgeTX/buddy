/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import "react-i18next";
import common from "../locales/en/common.json";
import compatibility from "../locales/en/compatibility.json";
import flashing from "../locales/en/flashing.json";

// react-i18next versions higher than 11.11.0
declare module "react-i18next" {
  // and extend them!
  interface CustomTypeOptions {
    // custom namespace type if you changed it
    defaultNS: "common";
    // custom resources type
    resources: {
      common: typeof common;
      compatibility: typeof compatibility;
      flashing: typeof flashing;
    };
  }
}
