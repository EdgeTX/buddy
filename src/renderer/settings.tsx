import { useLocalStorage } from "@rehooks/local-storage";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type, import/prefer-default-export
export const useSettings = () =>
  useLocalStorage("edgetx-buddy-settings", {
    expertMode: false,
  });
