import i18n from "i18next";
import detector from "i18next-browser-languagedetector";
import LazyImportPlugin from "./LazyImportPlugin";
import languages from "./languages";

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
    ns: ["common", "compatibility", "sdcard", "flashing"],
  });

export default i18n;
