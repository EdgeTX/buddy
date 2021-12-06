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
