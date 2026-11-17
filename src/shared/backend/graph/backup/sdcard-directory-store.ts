/**
 * Shared module for accessing SD card directory handles
 * across different GraphQL resolvers
 */

const maxDirectoriesHandles = 5;
const directories: {
  handle: FileSystemDirectoryHandle;
  id: string;
}[] = [];

export const registerDirectory = (
  id: string,
  handle: FileSystemDirectoryHandle
): void => {
  directories.push({ id, handle });

  if (directories.length > maxDirectoriesHandles) {
    directories.shift();
  }
};

export const getDirectoryHandleById = (
  id: string
): FileSystemDirectoryHandle | undefined =>
  directories.find((directory) => directory.id === id)?.handle;

export const getAllDirectories = (): typeof directories => directories;
