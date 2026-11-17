/**
 * EdgeTX Hardware and Firmware Constants
 *
 * These are fundamental hardware constraints and limits defined by the EdgeTX firmware.
 * Do not modify these values without understanding the impact on radio firmware compatibility.
 */

/**
 * Maximum number of model slots supported per radio type.
 * - Black and White radios: up to 60 models, numbered model00.yml to model59.yml (zero-padded, 0-indexed).
 * - ColourLCD radios: no formal limit, numbered model1.yml onwards (1-indexed, no padding).
 *
 * The presence of labels.yml in the MODELS directory indicates a ColourLCD radio.
 */
export const MAX_MODELS_BW = 60;
export const MAX_MODELS_COLOR = 99;

/**
 * Returns the maximum number of model slots based on radio type.
 * @param hasLabels - true if labels.yml exists (ColourLCD), false for B&W
 */
export const getMaxModels = (hasLabels: boolean): number =>
  hasLabels ? MAX_MODELS_COLOR : MAX_MODELS_BW;

/**
 * Returns the model slot name for a given 1-based index.
 * - ColourLCD: model1, model2, ... model99
 * - B&W: model00, model01, ... model59 (zero-padded, 0-indexed)
 * @param index - 1-based slot index
 * @param isColorLcd - true if labels.yml exists (ColourLCD radio)
 */
export const modelSlotName = (index: number, isColorLcd: boolean): string =>
  isColorLcd ? `model${index}` : `model${String(index - 1).padStart(2, "0")}`;

/**
 * Checks if a filename is a valid model file (not a macOS resource fork or labels file).
 */
export const isValidModelFile = (name: string): boolean =>
  name.endsWith(".yml") &&
  !name.startsWith("._") &&
  name !== "labels.yml" &&
  name !== "radio.yml";

/**
 * Checks if a filename is a valid model text file (e.g. notes bundled by Companion).
 */
export const isModelTextFile = (name: string): boolean =>
  name.endsWith(".txt") && !name.startsWith("._");
