import dirTree from "directory-tree";

export const directorySnapshot = (path: string): string => {
  const tree = dirTree(path, { normalizePath: true, attributes: ["size"] });
  tree.name = ".";

  const treeString = JSON.stringify(tree, undefined, 2);
  return treeString.replaceAll(path, ".");
};

export const waitForStageCompleted = async <
  T extends {
    stages: { [K in S]?: { completed: boolean; error?: string | null } | null };
  },
  S extends string
>(
  queue: AsyncIterator<T, any, undefined>,
  stage: S
): Promise<void> => {
  while (true) {
    const update = await queue.next();
    if (!update.done) {
      const job = update.value;
      if (job.stages[stage]?.completed) {
        return;
      }

      if (job.stages[stage]?.error) {
        throw new Error(job.stages[stage]?.error ?? "");
      }
    }
  }
};
