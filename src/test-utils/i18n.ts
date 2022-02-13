import i18n from "i18next";

void i18n.init({
  lng: "en",
  fallbackLng: "en",

  // have a common namespace used around the full app
  ns: ["common"],
  defaultNS: "common",

  interpolation: {
    escapeValue: false, // not needed for react!!
  },

  resources: { en: { common: {} } },
});

export default i18n;
