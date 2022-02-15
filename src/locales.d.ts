/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/consistent-type-definitions */
import "react-i18next";
import common from "../locales/zh/common.json";
import compatibility from "../locales/zh/compatibility.json";
import flashing from "../locales/zh/flashing.json";
import sdcard from "../locales/zh/sdcard.json";
import devtools from "../locales/zh/devtools.json";

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
      sdcard: typeof sdcard;
      devtools: typeof devtools;
    };
  }
}
