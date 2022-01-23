import useLocalStorage from "use-local-storage";
import React, { useCallback, createContext, useMemo, useContext } from "react";

type Settings = {
  expertMode: boolean;
};

type UpdateSettings = (newSettings: Partial<Settings>) => void;

const settingsContext = createContext({
  settings: {} as Settings,
  update: (() => {}) as UpdateSettings,
});

export const LocalStorageSettingsProvider: React.FC = ({ children }) => {
  const [settings, updateSettings] = useLocalStorage("edgetx-buddy-settings", {
    expertMode: false,
  });

  const update: UpdateSettings = useCallback(
    (newSettings) => {
      updateSettings({ ...settings, ...newSettings });
    },
    [updateSettings, settings]
  );

  return (
    <settingsContext.Provider
      value={useMemo(
        () => ({
          settings,
          update,
        }),
        [settings, update]
      )}
    >
      {children}
    </settingsContext.Provider>
  );
};

export const useSettings = (): [Settings, UpdateSettings] => {
  const { settings, update } = useContext(settingsContext);
  return [settings, update];
};
