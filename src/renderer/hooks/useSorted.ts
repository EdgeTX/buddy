import { useMemo, useState } from "react";

export default <T>(
  array: T[] | undefined | null,
  sortFunc: (a: T, b: T) => number
): T[] => {
  const [func] = useState(() => sortFunc);

  return useMemo(() => {
    const arrayCopy = [...(array ?? [])];
    arrayCopy.sort(func);
    return arrayCopy;
  }, [func, array]);
};
