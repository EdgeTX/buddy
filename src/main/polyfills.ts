/* eslint-disable @typescript-eslint/no-unnecessary-condition */
import { Blob } from "buffer";
import FetchCache from "@sozialhelden/fetch-cache/dist/FetchCache";
import fetch, { Headers, Request, Response } from "node-fetch";

if (!globalThis.Headers) {
  globalThis.Headers = Headers as unknown as typeof globalThis.Headers;
}

if (!globalThis.Request) {
  globalThis.Request = Request as unknown as typeof globalThis.Request;
}

if (!globalThis.Response) {
  globalThis.Response = Response as unknown as typeof globalThis.Response;
}

if (!globalThis.AbortController) {
  globalThis.AbortController = AbortController;
}

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
