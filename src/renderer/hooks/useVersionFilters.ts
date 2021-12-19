import { useCallback, useMemo } from "react";
import { VersionFilters } from "renderer/components/VersionTargetForm";

const filterKeys = ["includePrereleases"];

export default (
  filtersString?: string
): {
  filters: VersionFilters;
  encodeFilters: (newFilters: VersionFilters) => string | undefined;
} => {
  const filters = useMemo(() => {
    const enabledFilters = filtersString?.split(",");
    return filterKeys.reduce(
      (acc, key) => ({ ...acc, [key]: enabledFilters?.includes(key) }),
      {} as VersionFilters
    );
  }, [filtersString]);

  return {
    filters,
    encodeFilters: useCallback(
      (newFilters) =>
        Object.entries(newFilters)
          .filter(([, value]) => value)
          .map(([key]) => key)
          .join(",") || undefined,
      []
    ),
  };
};
