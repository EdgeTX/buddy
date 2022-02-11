import SchemaBuilder from "@pothos/core";
import SimpleObjectsPlugin from "@pothos/plugin-simple-objects";
import type { Context } from "shared/backend/context";

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createBuilder = () =>
  new SchemaBuilder<{ Context: Context }>({
    plugins: [SimpleObjectsPlugin],
  });
