/* eslint-disable functional/no-this-expression */
/* eslint-disable functional/no-class */
import ky from "ky-universal";
import { Reader } from "unzipit";
import config from "shared/config";

const fakeUserAgent =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/96.0.4664.45 Safari/537.36";

export default class ZipHTTPRangeReader implements Reader {
  private url: string;

  private length?: number;

  constructor(url: string) {
    this.url = url;
  }

  async getLength(): Promise<number> {
    if (this.length === undefined) {
      const req = await ky(this.url, {
        prefixUrl: config.proxyUrl,
        method: "HEAD",
        headers: {
          "user-agent": fakeUserAgent,
          // This really doesn't matter, we are just using something which might
          // help with slow requests
          Referer: "https://github.com/",
        },
      });
      if (!req.ok) {
        throw new Error(
          `failed http request ${this.url}, status: ${req.status}: ${req.statusText}`
        );
      }
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      this.length = parseInt(req.headers.get("content-length")!, 10);
      if (Number.isNaN(this.length)) {
        throw Error("could not get length");
      }
    }
    return this.length;
  }

  async read(offset: number, size: number): Promise<Uint8Array> {
    if (size === 0) {
      return new Uint8Array(0);
    }
    const req = await ky(this.url, {
      prefixUrl: config.proxyUrl,
      headers: {
        Range: `bytes=${offset}-${offset + size - 1}`,
        "user-agent": fakeUserAgent,
        Referer: "https://github.com/",
      },
      timeout: 60000,
    });
    if (!req.ok) {
      throw new Error(
        `failed http request ${this.url}, status: ${req.status} offset: ${offset} size: ${size}: ${req.statusText}`
      );
    }
    const buffer = await req.arrayBuffer();
    return new Uint8Array(buffer);
  }
}
