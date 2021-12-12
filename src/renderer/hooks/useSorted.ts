import { useMemo, useState } from "react";

/**
 * Sort the given array using the given sort function.
 *
 * The sort function is set once and doesn't change so if you change
 * your sort function don't expect this hook to reflect that
 */
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
