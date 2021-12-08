import dirTree from "directory-tree";

export const directorySnapshot = (path: string): string => {
  const tree = dirTree(path, { normalizePath: true, attributes: ["size"] });
  tree.name = ".";

  const treeString = JSON.stringify(tree, undefined, 2);
  return treeString.replaceAll(path, ".");
};
