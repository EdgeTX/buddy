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

declare module "*.worker.ts" {
  class WebpackWorker extends Worker {
    constructor();
  }
  export default WebpackWorker;
}

declare module "*.webp";

declare module "@jest/globals" {
  import "@types/jest";
  import "@testing-library/jest-dom";

  import type { Jest } from "@jest/environment";
  import type { Global } from "@jest/types";

  export declare const jest: Jest;
  export { expect };
  export declare const it: Global.GlobalAdditions["it"];
  export declare const test: Global.GlobalAdditions["test"];
  export declare const fit: Global.GlobalAdditions["fit"];
  export declare const xit: Global.GlobalAdditions["xit"];
  export declare const xtest: Global.GlobalAdditions["xtest"];
  export declare const describe: Global.GlobalAdditions["describe"];
  export declare const xdescribe: Global.GlobalAdditions["xdescribe"];
  export declare const fdescribe: Global.GlobalAdditions["fdescribe"];
  export declare const beforeAll: Global.GlobalAdditions["beforeAll"];
  export declare const beforeEach: Global.GlobalAdditions["beforeEach"];
  export declare const afterEach: Global.GlobalAdditions["afterEach"];
  export declare const afterAll: Global.GlobalAdditions["afterAll"];
}
