/* eslint-disable @typescript-eslint/consistent-type-definitions */
import "react-i18next";
// eslint-disable-next-line no-restricted-imports
import common from "../locales/en/common.json";

// react-i18next versions higher than 11.11.0
declare module "react-i18next" {
  // and extend them!
  interface CustomTypeOptions {
    // custom namespace type if you changed it
    defaultNS: "common";
    // custom resources type
    resources: {
      common: typeof common;
    };
  }
}
