/**
 * EdgeTX Hardware and Firmware Constants
 *
 * These are fundamental hardware constraints and limits defined by the EdgeTX firmware.
 * Do not modify these values without understanding the impact on radio firmware compatibility.
 */

/**
 * Maximum number of model slots supported.
 * - Black and White Radios support up to 60 models - numbered from model00.yml to model59.yml.
 * - ColourLCD radios have no *formal* limit, and are numbered from model1.yml to I don't know... model99.yml will do for now.
 */
export const MAX_MODELS = 60;
