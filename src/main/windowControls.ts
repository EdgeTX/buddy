// IPC channels used by the custom title bar (see WindowsNav) to control the
// window it is rendered in. The renderer sends via the preload; the main
// process handles them in registerWindowControls.
export const WINDOW_MINIMIZE = "WINDOW_MINIMIZE";
export const WINDOW_CLOSE = "WINDOW_CLOSE";
