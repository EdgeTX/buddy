export const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => {
    setTimeout(resolve, ms);
  });

export const times = (num: number): number[] =>
  new Array<number>(num).fill(1).map((_, i) => i);
