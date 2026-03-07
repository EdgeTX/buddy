import { mergeSchemas } from "@graphql-tools/schema";
import firmware from "./firmware";
import backup from "./backup";
import flash from "./flash";
import sdcard from "./sdcard";

export const schema = mergeSchemas({
  schemas: [firmware.schema, backup.schema, flash.schema, sdcard.schema],
});
