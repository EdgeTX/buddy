import { Blob } from "buffer";
import FetchCache from "@sozialhelden/fetch-cache/dist/FetchCache";
import fetch from "node-fetch";
// import "web-streams-polyfill/es2018";

globalThis.Blob = Blob as unknown as typeof globalThis.Blob;

const fetchCache = new FetchCache({
  fetch,
  cacheOptions: {
    maximalItemCount: 100,
    evictExceedingItemsBy: "lru",
  },
});

globalThis.fetch = fetchCache.fetch.bind(
  fetchCache
) as unknown as typeof globalThis.fetch;
