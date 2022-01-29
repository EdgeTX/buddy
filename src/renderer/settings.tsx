import { useLocalStorage } from "@rehooks/local-storage";
import { useCallback } from "react";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, import/prefer-default-export
export const useSettings = () => {
  const [settings, updateSettings] = useLocalStorage("edgetx-buddy-settings", {
    expertMode: false,
    browserCompatDismissed: false,
  });

  return [
    settings,
    useCallback(
      (newSettings: Partial<typeof settings>) =>
        updateSettings({ ...settings, ...newSettings }),
      [settings, updateSettings]
    ),
  ] as const;
};
