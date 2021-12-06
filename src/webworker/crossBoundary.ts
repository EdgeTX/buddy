import { isObject } from "type-guards";

export type FunctionResponseType<T> = {
  type: string;
  args: { id: number } & ({ data: T } | { error: Error });
};

export type FunctionRequestType<A extends unknown[]> = {
  type: string;
  args: { id: number; args: A };
};

const waitForResponse = <T>(requestType: string, requestId: number) =>
  new Promise<T>((resolve, reject) => {
    const listener = (message: MessageEvent<unknown>) => {
      if (
        isObject(message.data) &&
        "type" in message.data &&
        "args" in message.data
      ) {
        const response = message.data as FunctionResponseType<T>;
        if (response.type === requestType && response.args.id === requestId) {
          if ("data" in response.args) {
            resolve(response.args.data);
          } else if ("error" in response.args) {
            reject(response.args.error);
          }

          self.removeEventListener("message", listener);
        }
      }
    };

    self.addEventListener("message", listener);
  }) as T extends Promise<unknown> ? T : Promise<T>;

let incrementedId = 0;

const getCallId = (): number => {
  incrementedId += 1;
  incrementedId = incrementedId % 1000;
  return incrementedId;
};

type KeysMatching<T, V> = {
  [K in keyof T]-?: T[K] extends V ? K : never;
}[keyof T];

/**
 * Creates a handler for the given window function
 * so that it can be called cross boundary. The returned result
 * is sent back to the caller in the web worker
 */
export const createCrossBoundryWindowFunction = <
  F extends KeysMatching<typeof window, Function>
>(
  name: F
) => {
  type Return = ReturnType<typeof window[F]>;
  type Params = Parameters<typeof window[F]>;

  const type = `call${name}`;
  return {
    call: (...params: Params) => {
      const id = getCallId();
      self.postMessage({
        type,
        args: { args: params, id },
      } as FunctionRequestType<Params>);
      return waitForResponse<Return>(type, id);
    },
    installHandler: (
      worker: Worker,
      beforeReturnHook?: (returnData: Awaited<Return>) => Promise<void>
    ) => {
      worker.addEventListener("message", async (event) => {
        const request = event.data as FunctionRequestType<Params>;
        if (isObject(request) && request.type === type) {
          try {
            const response = await (window[name](request.args.args) as Return);
            await beforeReturnHook?.(response);

            worker.postMessage({
              type,
              args: {
                id: request.args.id,
                data: response,
              },
            } as FunctionResponseType<Return>);
          } catch (e) {
            console.error(e);
            worker.postMessage({
              type,
              args: { id: request.args.id, error: e as Error },
            } as FunctionResponseType<Return>);
          }
        }
      });
    },
  };
};
