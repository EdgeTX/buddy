import { showDirectoryPicker, requestDevice } from "./crossboundary/functions";

const worker = new Worker(new URL("./webworker.worker.ts", import.meta.url));

showDirectoryPicker.listen(worker);
requestDevice.listen(worker);

export default worker;
