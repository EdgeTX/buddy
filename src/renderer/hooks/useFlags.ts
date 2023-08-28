import { useCallback, useMemo } from "react";
import { SelectedFlags } from "shared/backend/services/cloudbuild";

export default (
  flagsString?: string
): {
  selectedFlags: SelectedFlags | undefined;
  encodeFlags: (newFlags: SelectedFlags | undefined) => string | undefined;
} => {
  const selectedFlags = useMemo(
    () =>
      flagsString?.split("&").map((flagString) => {
        const flag = flagString.split("=");
        const name = flag.at(0);
        const value = flag.at(1);
        return {
          name: name ? decodeURIComponent(name) : undefined,
          value: value ? decodeURIComponent(value) : undefined,
        };
      }),
    [flagsString]
  );

  return {
    selectedFlags,
    encodeFlags: useCallback((newFlags) => {
      if (!newFlags || newFlags.length === 0) return undefined;
      return newFlags
        .map(
          (flag) =>
            `${encodeURIComponent(flag.name ?? "")}=${encodeURIComponent(
              flag.value ?? ""
            )}`
        )
        .join("&");
    }, []),
  };
};
