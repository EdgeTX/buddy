import { showDirectoryPicker, requestDevice } from "./crossboundary/functions";

const worker = new Worker(new URL("./backend.worker.ts", import.meta.url));

showDirectoryPicker.listen(worker);
requestDevice.listen(worker);

export default worker;
