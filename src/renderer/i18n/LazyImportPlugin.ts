import { BackendModule, ResourceKey } from "i18next";
import { fetchAntLocale } from "./ant";

const LazyImportPlugin: BackendModule = {
  type: "backend",
  init() {},
  read(language, namespace, callback) {
    void fetchAntLocale(language);
    void import(`../../../locales/${language}/${namespace}.json`).then(
      (obj: ResourceKey) => {
        callback(null, obj);
      }
    );
  },
  create() {},
};

export default LazyImportPlugin;
