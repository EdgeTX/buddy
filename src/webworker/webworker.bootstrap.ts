import { createCrossBoundryWindowFunction } from "./crossBoundary";

const worker = new Worker(new URL("./webworker.worker.ts", import.meta.url));

const showDirectoryPicker = createCrossBoundryWindowFunction(
  "showDirectoryPicker"
);
showDirectoryPicker.installHandler(worker, async (handle) => {
  await handle.getFileHandle("edgetxflasherpermissions.txt", { create: true });
  await handle.removeEntry("edgetxflasherpermissions.txt");
});

export default worker;
