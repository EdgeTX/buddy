import { GraphQLError } from "graphql";
import { createBuilder } from "shared/backend/utils/builder";
import { findSplash, patchSplash, getSplashBoardInfo } from "shared/splash";

const builder = createBuilder();

const SplashCapability = builder.simpleObject("SplashCapability", {
  fields: (t) => ({
    format: t.string(),
    width: t.int(),
    height: t.int(),
    maxBytes: t.int(),
  }),
});

const PatchedFirmware = builder.simpleObject("PatchedFirmware", {
  fields: (t) => ({
    id: t.id(),
    name: t.string(),
    base64Data: t.string(),
  }),
});

builder.queryType({
  fields: (t) => ({
    // Static lookup by known target code, so the UI can show/hide the
    // "Edit splash" entry point for Cloud/CloudBuild firmware before any
    // bytes have been fetched.
    splashCapability: t.field({
      type: SplashCapability,
      nullable: true,
      args: {
        targetCode: t.arg.string({ required: true }),
      },
      resolve: (_, { targetCode }) => getSplashBoardInfo(targetCode) ?? null,
    }),
    // Detects the splash format directly from a registered local
    // firmware's bytes - used for locally-uploaded firmware, which has
    // no known target code to look up in the static table.
    firmwareSplashInfo: t.field({
      type: SplashCapability,
      nullable: true,
      args: {
        firmwareId: t.arg.id({ required: true }),
      },
      resolve: (_, { firmwareId }, { firmwareStore }) => {
        const firmware = firmwareStore.getLocalFirmwareById(
          firmwareId.toString()
        );
        if (!firmware) {
          return null;
        }
        const location = findSplash(firmware.data);
        if (!location) {
          return null;
        }
        return {
          format: location.format,
          width: location.width,
          height: location.height,
          maxBytes: location.reservedSize,
        };
      },
    }),
  }),
});

builder.mutationType({
  fields: (t) => ({
    // Patches an already-registered local firmware's splash region with
    // pre-dithered, pre-packed splash bytes (see shared/splash/codec.ts
    // encodeSplash) and registers the result as new local firmware, so it
    // flows unchanged into the existing flash job / download machinery.
    patchFirmwareSplash: t.field({
      type: PatchedFirmware,
      args: {
        firmwareId: t.arg.id({ required: true }),
        packedSplashBase64: t.arg.string({ required: true }),
      },
      resolve: (_, { firmwareId, packedSplashBase64 }, { firmwareStore }) => {
        const firmware = firmwareStore.getLocalFirmwareById(
          firmwareId.toString()
        );
        if (!firmware) {
          throw new GraphQLError("Firmware not found");
        }

        const location = findSplash(firmware.data);
        if (!location) {
          throw new GraphQLError(
            "No embedded splash region found in this firmware"
          );
        }

        const packed = Buffer.from(packedSplashBase64, "base64");
        const patched = patchSplash(firmware.data, location, packed);
        const id = firmwareStore.registerFirmware(
          Buffer.from(patched),
          firmware.name
        );

        return {
          id,
          name: firmware.name ?? id,
          base64Data: Buffer.from(patched).toString("base64"),
        };
      },
    }),
  }),
});

export default {
  schema: builder.toSchema({}),
};
