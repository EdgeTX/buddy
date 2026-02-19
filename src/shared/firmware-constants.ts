/**
 * EdgeTX Hardware and Firmware Constants
 *
 * These are fundamental hardware constraints and limits defined by the EdgeTX firmware.
 * Do not modify these values without understanding the impact on radio firmware compatibility.
 */

/**
 * Maximum number of model slots supported.
 * EdgeTX firmware supports up to 60 model slots (model00-model59).
 * This can actually vary depending on the radio family/type, but all radios are currently configured as 60.
 */
export const MAX_MODELS = 60;
