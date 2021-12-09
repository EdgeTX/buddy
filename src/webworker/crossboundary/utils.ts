/**
 * There are some browser requests which cannot be made inside web workers. So although
 * our graphql context exists in the webworker, we need to be able to make calls back
 * out to the window process to get the information we need.
 */
import { isObject } from "type-guards";

type FunctionResponseType<T> = {
  type: string;
  args: { id: number } & ({ data: T } | { error: Error });
};

type FunctionRequestType<A extends unknown[]> = {
  type: string;
  args: { id: number; args: A };
};

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
const waitForResponse = <T>(
  workerSelf: typeof globalThis,
  requestType: string,
  requestId: number
) =>
  new Promise<T>((resolve, reject) => {
    const listener = (message: MessageEvent<unknown>): void => {
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

          workerSelf.removeEventListener("message", listener);
        }
      }
    };

    workerSelf.addEventListener("message", listener);
  }) as T extends Promise<unknown> ? T : Promise<T>;

let incrementedId = 0;

const getCallId = (): number => {
  incrementedId += 1;
  incrementedId %= 1000;
  return incrementedId;
};

/**
 * Creates a handler for the given function
 * so that it can be called cross boundary. The returned result
 * is sent back to the caller in the web worker
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
export const createCrossBoundryFunction = <
  F extends (...args: never[]) => unknown | Promise<unknown>
>(
  name: string,
  handler: F
) => {
  type Return = ReturnType<F>;
  type Params = Parameters<F>;

  const type = `call${name}`;
  return {
    call: (workerSelf: typeof globalThis, ...params: Params) => {
      const id = getCallId();
      workerSelf.postMessage({
        type,
        args: { args: params, id },
      } as FunctionRequestType<Params>);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return waitForResponse<Return>(workerSelf, type, id);
    },
    listen: (worker: Worker) => {
      worker.addEventListener("message", async (event) => {
        const request = event.data as FunctionRequestType<Params>;
        if (isObject(request) && request.type === type) {
          try {
            const response = (await handler(...request.args.args)) as Return;

            worker.postMessage({
              type,
              args: {
                id: request.args.id,
                data: response,
              },
            } as FunctionResponseType<Return>);
          } catch (e) {
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
