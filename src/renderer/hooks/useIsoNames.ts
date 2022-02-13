import { useMemo } from "react";
import ISO6391 from "iso-639-1";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default <T extends string>(ids: readonly T[]) =>
  useMemo(
    () =>
      ids.map((iso) => ({
        id: iso,
        name: ISO6391.validate(iso)
          ? ISO6391.getNativeName(iso)
          : iso.toUpperCase(),
      })),
    [ids]
  );
