import { ConfigProvider } from "antd";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { fetchAntLocale, Locale } from "./i18n/ant";

const AntProvider: React.FC = ({ children }) => {
  const [locale, setLocale] = useState<Locale>();
  const { i18n } = useTranslation();
  useEffect(() => {
    let cancelled = false;
    void fetchAntLocale(i18n.language)
      .then((l) => {
        if (cancelled) {
          return;
        }
        setLocale(l);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [i18n.language]);
  return <ConfigProvider locale={locale}>{children}</ConfigProvider>;
};

export default AntProvider;
