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

/**
 * Creates a handler for the given function
 * so that it can be called cross boundary. The returned result
 * is sent back to the caller in the web worker
 */
const createCrossBoundryFunction = <F extends (...args: any[]) => any>(
  name: string
) => {
  type Return = ReturnType<F>;
  type Params = Parameters<F>;

  const type = `call${name}`;
  return {
    call: (...params: Params) => {
      console.log(params);
      const id = getCallId();
      self.postMessage({
        type,
        args: { args: params, id },
      } as FunctionRequestType<Params>);
      return waitForResponse<Return>(type, id);
    },
    installHandler: (worker: Worker, caller: F) => {
      worker.addEventListener("message", async (event) => {
        const request = event.data as FunctionRequestType<Params>;
        if (isObject(request) && request.type === type) {
          try {
            const response = (await caller(...request.args.args)) as Return;

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

export default {
  requestDevice:
    createCrossBoundryFunction<
      (
        ...params: Parameters<typeof navigator.usb.requestDevice>
      ) => Promise<Pick<USBDevice, "vendorId" | "productId">>
    >("usb.requestDevice"),
  showDirectoryPicker: createCrossBoundryFunction<
    typeof window.showDirectoryPicker
  >("showDirectoryPicker"),
};
