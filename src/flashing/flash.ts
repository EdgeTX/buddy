type State = {
  progress: number;
  started: boolean;
  completed: boolean;
  error?: string;
};

type FlashState = {
  building: State;
  connection: {
    connected: boolean;
    connecting: boolean;
    error?: string;
  };
  downloading?: State;
  erasing: State;
  flashing: State;
};

type ReturnVars = {
  state: FlashState;
  // Loads the firmware and returns the identifier string
  loadFirmware: (data: Buffer) => Promise<string>;
  flash: (firmware: string) => void;
  cancel: () => void;
};

export const useFlasher = (): ReturnVars => {};
