import { Blob } from "buffer";
import FetchCache from "@sozialhelden/fetch-cache";
import fetch from "node-fetch";

globalThis.Blob = Blob as unknown as typeof globalThis.Blob;
globalThis.fetch = new FetchCache({
  fetch,
  cacheOptions: {
    maximalItemCount: 100,
    evictExceedingItemsBy: "lru",
  },
}) as unknown as typeof globalThis.fetch;
