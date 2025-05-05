/*
 * UF2 (USB Flashing Format) JavaScript Library
 *
 * UF2 Format specification: https://github.com/microsoft/uf2
 *
 * Copyright (C) 2021, Uri Shaked.
 * Copyright (C) 2024, EdgeTX.
 * Released under the terms of the MIT License.
 */

export const blockSize = 512;
export const headerSize = 32;
export const maxPayloadSize = blockSize - headerSize - 4;

const magicStart1 = 0x0a324655; // "UF2\n"
const magicStart2 = 0x9e5d5157; // Randomly selected
const magicFinal = 0x0ab16f30;

export const magicValues = [
  { offset: 0, value: magicStart1 },
  { offset: 4, value: magicStart2 },
  { offset: blockSize - 4, value: magicFinal },
];

// official extension tags
export const versionExtensionTag = 0x9fc7bc;
export const deviceExtensionTag = 0x650d9d;

// EdgeTX specific extension
export const rebootExtensionTag = 0xe60835;

export const UF2Flags = {
  notMainFlash: 0x00000001,
  fileContainer: 0x00001000,
  familyIDPresent: 0x00002000,
  md5ChecksumPresent: 0x00004000,
  extensionTagsPresent: 0x00008000,
};

export type UF2BlockData = {
  /** See UF2Flags for possible flag values. */
  flags: {
    isMainFlash: boolean;
    fileContainer: boolean;
    familyIDPresent: boolean;
    md5ChecksumPresent: boolean;
    extensionTagsPresent: boolean;
  };

  /** Address in flash where the data should be written */
  flashAddress: number;

  /** The payload usually contains 256 bytes, but can be up to 476 bytes */
  payload: Uint8Array;

  /** Sequential block number; starts at 0 */
  blockNumber: number;

  /** Total number of blocks in file */
  totalBlocks: number;

  /** Total file size (if not family ID present) */
  fileSize: number;

  /** Board family ID (if family ID present) */
  boardFamily: number;

  /** Extension tags & values */
  extensions: UF2Extension[];
};

export type UF2Extension = {
  tag: number;
  payload: Uint8Array;
};

// eslint-disable-next-line functional/no-class
export class UF2DecodeError extends Error {}

export function isUF2Payload(buffer: ArrayBuffer): boolean {
  // Need at least 8 bytes to check the magic numbers
  if (buffer.byteLength < 8) {
    return false;
  }

  // Create a DataView to read the buffer
  const view = new DataView(buffer);

  try {
    // Read magic numbers from the first block
    const start1 = view.getUint32(0, true);
    const start2 = view.getUint32(4, true);

    // If first block doesn't match the magic numbers, it's not UF2
    return start1 === magicStart1 && start2 === magicStart2;
  } catch (error) {
    // If there's any error accessing the buffer, it's not a valid UF2
    return false;
  }
}

export function isUF2Block(data: Uint8Array): boolean {
  if (data.length !== blockSize) {
    return false;
  }
  const dataView = new DataView(data.buffer, data.byteOffset);
  return magicValues.every(
    ({ offset, value }) => dataView.getUint32(offset, true) === value
  );
}

function pad32(n: number): number {
  const rem = n % 4;
  return rem > 0 ? n + 4 - rem : n;
}

function decodeExtensions(data: Uint8Array): UF2Extension[] {
  const dataView = new DataView(data.buffer, data.byteOffset);
  const extensions: UF2Extension[] = [];
  let offset = 0;

  while (offset < data.length) {
    /* eslint-disable no-bitwise */
    const hdr = dataView.getUint32(offset, true);
    if (hdr === 0) break;

    const length = hdr & 0xff;
    const tag = (hdr >> 8) & 0xffffff;
    extensions.push({
      tag,
      payload: data.slice(offset + 4, offset + length),
    });
    offset += pad32(length);
  }
  return extensions;
}

export function decodeBlock(data: Uint8Array): UF2BlockData {
  if (data.length !== blockSize) {
    throw new UF2DecodeError(
      `Invalid UF2 block size. Block size must be exactly ${blockSize} bytes.`
    );
  }
  const dataView = new DataView(data.buffer, data.byteOffset);
  magicValues.forEach(({ offset, value }) => {
    const actual = dataView.getUint32(offset, true);
    if (actual !== value) {
      throw new UF2DecodeError(
        `Invalid magic value at offset ${offset}: expected 0x${value.toString(
          16
        )}, but found 0x${actual.toString(16)}.`
      );
    }
  });

  const iflags = dataView.getUint32(8, true);
  const flashAddress = dataView.getUint32(12, true);
  const payloadSize = dataView.getUint32(16, true);
  const blockNumber = dataView.getUint32(20, true);
  const totalBlocks = dataView.getUint32(24, true);
  const boardFamilyOrFileSize = dataView.getUint32(28, true);
  if (payloadSize > maxPayloadSize) {
    throw new UF2DecodeError(
      `Invalid payload size ${payloadSize}. Should be ${maxPayloadSize} bytes or less.`
    );
  }

  const flags = {
    isMainFlash: (iflags & UF2Flags.notMainFlash) === 0,
    fileContainer: (iflags & UF2Flags.fileContainer) !== 0,
    familyIDPresent: (iflags & UF2Flags.familyIDPresent) !== 0,
    md5ChecksumPresent: (iflags & UF2Flags.md5ChecksumPresent) !== 0,
    extensionTagsPresent: (iflags & UF2Flags.extensionTagsPresent) !== 0,
  };

  let extensions: UF2Extension[] = [];
  if (flags.extensionTagsPresent) {
    extensions = decodeExtensions(
      data.slice(32 + payloadSize, data.length - 4)
    );
  }

  return {
    flags,
    flashAddress,
    payload: data.slice(32, 32 + payloadSize),
    blockNumber,
    totalBlocks,
    fileSize: flags.familyIDPresent ? 0 : boardFamilyOrFileSize,
    boardFamily: flags.familyIDPresent ? boardFamilyOrFileSize : 0,
    extensions,
  };
}

export type UF2AddressRange = {
  startAddress: number;
  payload: Uint8Array;
};

export type UF2Reboot = UF2AddressRange & {
  rebootAddress: number;
};

function reduceUint8Arrays(chunks: Uint8Array[]): Uint8Array {
  let size = 0;
  chunks.forEach((chunk) => {
    size += chunk.length;
  });
  const buffer = new Uint8Array(size);
  let offset = 0;
  chunks.forEach((chunk) => {
    buffer.set(chunk, offset);
    offset += chunk.length;
  });
  return buffer;
}

function isRebootBlock(block: UF2BlockData): boolean {
  if (block.flags.isMainFlash) return false;
  const extension = block.extensions.find(
    (ext) => ext.tag === rebootExtensionTag
  );
  return extension !== undefined;
}

function makeRebootBlock(block: UF2BlockData): UF2Reboot {
  const extension = block.extensions.find(
    (ext) => ext.tag === rebootExtensionTag
  );
  if (!extension) {
    throw new UF2DecodeError(`Missing extension ${rebootExtensionTag}`);
  }
  const dataView = new DataView(
    extension.payload.buffer,
    extension.payload.byteOffset
  );
  return {
    startAddress: block.flashAddress,
    payload: block.payload,
    rebootAddress: dataView.getUint32(0, true),
  };
}

function getExtensionString(
  extensions: UF2Extension[],
  tag: number
): string | undefined {
  const foundExtension = extensions.find((ext) => ext.tag === tag);
  return foundExtension
    ? new TextDecoder().decode(foundExtension.payload)
    : undefined;
}

function getDeviceDescription(extensions: UF2Extension[]): string | undefined {
  return getExtensionString(extensions, deviceExtensionTag);
}

function getFirmwareVersion(extensions: UF2Extension[]): string | undefined {
  return getExtensionString(extensions, versionExtensionTag);
}

export type UF2BlockGenerator = Generator<UF2BlockData, void, undefined>;
export type UF2AddressRangeGenerator = Generator<
  UF2AddressRange | UF2Reboot,
  void,
  undefined
>;

function* getBlocks(data: Uint8Array): UF2BlockGenerator {
  let offset = 0;
  while (offset < data.length) {
    const block = decodeBlock(data.slice(offset, offset + blockSize));
    offset += blockSize;
    yield block;
  }
}

export function* getAddressRanges(data: Uint8Array): UF2AddressRangeGenerator {
  let startAddress = 0;
  let lastAddress = 0;
  let chunks: Uint8Array[] = [];

  const accumulateBlock = (block: UF2BlockData): void => {
    const { flashAddress, payload } = block;
    if (chunks.length === 0) {
      startAddress = flashAddress;
      lastAddress = startAddress;
    }
    lastAddress += payload.length;
    chunks.push(payload);
  };

  const makeRange = (): UF2AddressRange => {
    const range = {
      startAddress,
      payload: reduceUint8Arrays(chunks),
    };
    chunks = [];
    return range;
  };

  /* eslint-disable no-restricted-syntax */
  for (const block of getBlocks(data)) {
    if (isRebootBlock(block)) {
      yield makeRange();
      yield makeRebootBlock(block);
    } else if (!block.flags.isMainFlash) {
      /* eslint-disable no-empty */
    } else {
      if (chunks.length > 0 && lastAddress !== block.flashAddress) {
        yield makeRange();
      }
      accumulateBlock(block);
    }
  }
  if (chunks.length > 0) {
    yield makeRange();
  }
}

export type UF2Reader = {
  data: Uint8Array;
  device: string;
  version: string;
  blocks: typeof getBlocks;
  addressRanges: typeof getAddressRanges;
};

export const newUF2Reader = (data: Uint8Array): UF2Reader => {
  let device = "unknown";
  let version = "unknown";

  if (data.length % blockSize > 0) {
    throw new UF2DecodeError(`Invalid length: no a multiple of ${blockSize}`);
  }

  for (let b = 0; b < data.length / blockSize; b += 1) {
    if (!isUF2Block(data.slice(b * blockSize, (b + 1) * blockSize))) {
      throw new UF2DecodeError("");
    }
  }

  if (data.length > 0) {
    const block = decodeBlock(data.slice(0, blockSize));
    device = getDeviceDescription(block.extensions) ?? "unknown";
    version = getFirmwareVersion(block.extensions) ?? "unknown";
  }

  const blocks: typeof getBlocks = () => getBlocks(data);
  const addressRanges: typeof getAddressRanges = () => getAddressRanges(data);

  return {
    data,
    device,
    version,
    blocks,
    addressRanges,
  };
};
