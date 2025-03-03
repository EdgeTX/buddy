import i18n from "i18next";
import detector from "i18next-browser-languagedetector";
import { CustomTypeOptions } from "react-i18next";
import LazyImportPlugin from "./LazyImportPlugin";
import languages from "./languages";

const exhaustiveStringTuple =
  <T extends string>() =>
  <L extends [T, ...T[]]>(
    ...x: L extends unknown
      ? Exclude<T, L[number]> extends never
        ? L
        : Exclude<T, L[number]>[]
      : never
  ) =>
    x;

// Ensure that we maintain a list of used namespaces here
// so that we fetch all namespaces when we switch language
const namespaces = exhaustiveStringTuple<
  keyof CustomTypeOptions["resources"]
>()("common", "compatibility", "sdcard", "flashing", "devtools", "backup");

void i18n
  .use(LazyImportPlugin)
  .use(detector)
  .init({
    fallbackLng: "en",
    supportedLngs: languages,
    interpolation: {
      escapeValue: false,
    },
    defaultNS: "common",
    ns: namespaces,
    debug: process.env.NODE_ENV !== "production",
    react: {
      // locale extraction doesn't understand this property,
      // so we have to not keep any of the basic html nodes
      transKeepBasicHtmlNodesFor: [],
    },
    detection: {
      convertDetectedLanguage: (lng: string) => lng.split("-")[0],
    },
  });

export default i18n;
