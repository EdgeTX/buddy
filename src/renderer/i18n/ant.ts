import { Locale } from "antd/lib/locale-provider";
import languages from "./languages";

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
