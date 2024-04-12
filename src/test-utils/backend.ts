/* eslint-disable import/prefer-default-export */
import {
  DocumentNode,
  execute,
  ExecutionArgs,
  ExecutionResult,
  OperationDefinitionNode,
} from "graphql";
import { createContext, schema, UsbApi, FileSystemApi } from "shared/backend";
import { Context } from "shared/backend/context";
import * as dfuApi from "shared/backend/services/dfu";

export type PromiseOrValue<T> = Promise<T> | T;

type QueryArgs = { query: DocumentNode; variables?: Record<string, unknown> };
type MutationArgs = {
  mutation: DocumentNode;
  variables?: Record<string, unknown>;
};
type QueryFunction = (args: QueryArgs) => PromiseOrValue<ExecutionResult>;
type MutationFunction = (args: MutationArgs) => ReturnType<QueryFunction>;

type Executor = {
  query: QueryFunction;
  mutate: MutationFunction;
  context: Context;
};

const getOperationName = (document: DocumentNode): string | undefined =>
  document.definitions.find(
    (def): def is OperationDefinitionNode => def.kind === "OperationDefinition"
  )?.name?.value;

export const createExecutor = ({
  usb = {} as UsbApi,
  fileSystem = {} as FileSystemApi,
  dfu = {} as typeof dfuApi,
} = {}): Executor => {
  const contextGenerator = createContext({
    usb,
    fileSystem,
    dfu,
  });

  const executeQuery: QueryFunction = ({ query, variables }) => {
    const args: ExecutionArgs = {
      schema,
      contextValue: contextGenerator(),
      variableValues: variables,
      operationName: getOperationName(query),
      document: query,
    };

    return execute(args);
  };

  return {
    query: executeQuery,
    mutate: ({ mutation, variables }) =>
      executeQuery({ query: mutation, variables }),
    context: contextGenerator(),
  };
};
