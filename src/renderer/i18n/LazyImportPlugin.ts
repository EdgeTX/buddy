import { BackendModule, ResourceKey } from "i18next";
import { fetchAntLocale } from "./ant";

const LazyImportPlugin: BackendModule = {
  type: "backend",
  init() {},
  read(language, namespace, callback) {
    void fetchAntLocale(language);
    // en is the default, so just use the key strings
    if (language === "en") {
      callback(null, {});
      return;
    }
    void import(`../../../locales/${language}/${namespace}.json`).then(
      (obj: ResourceKey) => {
        callback(null, obj);
      }
    );
  },
};

export default LazyImportPlugin;
