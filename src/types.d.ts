/* eslint-disable import/no-extraneous-dependencies */
declare module "native-file-system-adapter/src/getOriginPrivateDirectory" {
  export default function getOriginPrivateDirectory(
    driver?: object | undefined,
    path: string
  ): Promise<FileSystemDirectoryHandle>;
}

declare module "native-file-system-adapter/src/adapters/node" {
  export default {};
}

declare module "apollo-link-logger" {
  import { ApolloLink } from "@apollo/client";

  export default {} as ApolloLink;
}

declare module "node-fetch-cache" {
  import fetch from "node-fetch";

  export class MemoryCache {
    constructor(args: { ttl: number });
  }

  export const fetchBuilder = {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    withCache: (cache: MemoryCache) => fetch,
  };

  export default fetch;
}
