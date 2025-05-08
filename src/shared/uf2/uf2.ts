const isUF2Payload = (buffer: ArrayBuffer): boolean => {
  // Need at least 8 bytes to check the magic numbers
  if (buffer.byteLength < 8) {
    return false;
  }

  // UF2 magic numbers at the start of each block
  const UF2_MAGIC_START1 = 0x0a324655; // "UF2\n"
  const UF2_MAGIC_START2 = 0x9e5d5157; // Randomly selected

  // Create a DataView to read the buffer
  const view = new DataView(buffer);

  try {
    // Read magic numbers from the first block
    const magicStart1 = view.getUint32(0, true);
    const magicStart2 = view.getUint32(4, true);

    // If first block doesn't match the magic numbers, it's not UF2
    return magicStart1 === UF2_MAGIC_START1 && magicStart2 === UF2_MAGIC_START2;
  } catch (error) {
    // If there's any error accessing the buffer, it's not a valid UF2
    return false;
  }
};

export default isUF2Payload;
