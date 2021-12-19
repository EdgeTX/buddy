import { useCallback } from "react";
import { useSearchParams } from "react-router-dom";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export default <K extends string>() => {
  const [params, setParams] = useSearchParams();
  const parseParam = useCallback(
    <T extends typeof String | typeof Boolean | typeof Number = typeof String>(
      key: K,
      type?: T
    ): ReturnType<T> | undefined => {
      const value = params.get(key);

      if (type === Number) {
        const parsedValue = Number(value);
        if (!Number.isNaN(parsedValue)) {
          return parsedValue as ReturnType<T>;
        }
      }

      if (type === Boolean && value !== null) {
        return (value === "true") as ReturnType<T>;
      }

      if (value !== null) {
        return value as ReturnType<T>;
      }

      return undefined;
    },
    [params]
  );

  return {
    updateParams: useCallback(
      (
        newParams: Partial<Record<K, boolean | string | number>>,
        replace?: boolean
      ) => {
        console.log(newParams);
        const newObject = {
          ...Object.fromEntries(
            Array.from(params.keys()).map((key) => [key, params.get(key)])
          ),
          ...newParams,
        };
        setParams(
          Object.fromEntries(
            Object.entries(newObject).filter(
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              ([, value]) => value !== undefined && value !== null
            ) as [string, string][]
          ),
          { replace: replace ?? true }
        );
      },
      [setParams, params]
    ),
    setParams,
    parseParam,
  };
};
