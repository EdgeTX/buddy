import { useCallback, useState } from "react";
import { useSearchParams } from "react-router-dom";

type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<
  infer ElementType
>
  ? ElementType
  : never;

export default <K extends string>(initalParamKeys: K[]) => {
  const [paramKeys] = useState(initalParamKeys);
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
      (newParams: Partial<Record<K, boolean | string | number>>) => {
        const newObject = {
          ...Object.fromEntries(paramKeys.map((key) => [key, parseParam(key)])),
          ...newParams,
        };
        setParams(
          Object.fromEntries(
            Object.entries(newObject).filter(
              ([, value]) => value !== null && value !== undefined
            ) as [string, string][]
          ),
          { replace: true }
        );
      },
      [params, setParams]
    ),
    setParams,
    parseParam,
  };
};
