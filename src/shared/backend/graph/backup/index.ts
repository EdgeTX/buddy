import { createBuilder } from "shared/backend/utils/builder";

const builder = createBuilder();

export default {
  schema: builder.toSchema({}),
};
