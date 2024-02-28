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

declare module "*?worker" {
  const workerConstructor: {
    new (): Worker;
  };
  export default workerConstructor;
}

declare module "*.webp" {
  const thing: string;
  export default thing;
}

// eslint-disable-next-line @typescript-eslint/consistent-type-definitions
declare interface Window {
  ipcRenderer?: typeof import("electron")["ipcRenderer"];
  electronMinimize?: () => void;
  electronClose?: () => void;
}
