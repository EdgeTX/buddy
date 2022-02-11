import { mergeSchemas } from "@graphql-tools/schema";
import firmware from "./firmware";
import flash from "./flash";
import sdcard from "./sdcard";

export const schema = mergeSchemas({
  schemas: [firmware.schema, flash.schema, sdcard.schema],
});
