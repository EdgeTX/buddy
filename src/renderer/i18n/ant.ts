import { ConfigProviderProps } from "antd";
import languages from "./languages";

export type Locale = ConfigProviderProps["locale"];

type Language = (typeof languages)[number];

export const languageToAntLocale: Record<
  Language,
  (() => Promise<{ default: Locale } | undefined>) | undefined
> = {
  en: () => Promise.resolve(undefined),
  zh: () => import("antd/lib/locale/zh_CN"),
};

export const fetchAntLocale = async (
  language: string
): Promise<Locale | undefined> =>
  (await languageToAntLocale[language]?.())?.default;
