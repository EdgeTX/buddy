import ky from "ky";
import React, { useEffect, useState } from "react";
import { flash } from "./dfu";

const useFirmware = (): Buffer | undefined => {
  const [buffer, setBuffer] = useState<Buffer>();

  useEffect(() => {
    ky.get("/nv14.bin").then(async (res) => {
      setBuffer(Buffer.from(await res.arrayBuffer()));
    });
  }, []);

  return buffer;
};

const App: React.FC = () => {
  const firmware = useFirmware();

  return (
    <div>
      <h1>EdgeTX Flasher</h1>
      {firmware ? (
        <button
          onClick={() => {
            flash(firmware);
          }}
        >
          Flash!
        </button>
      ) : (
        <div>Downloading firmware</div>
      )}
    </div>
  );
};

export default App;
