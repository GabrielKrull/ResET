export class PasswordHashCapacityError extends Error {
  constructor() {
    super("Password hashing capacity is currently full.");
    this.name = "PasswordHashCapacityError";
  }
}

export function createConcurrencyLimiter(maxConcurrent: number, maxQueued: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  return function run<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const start = (): void => {
        active += 1;
        Promise.resolve()
          .then(operation)
          .then(resolve, reject)
          .finally(() => {
            active -= 1;
            queue.shift()?.();
          });
      };

      if (active < maxConcurrent) {
        start();
      } else if (queue.length < maxQueued) {
        queue.push(start);
      } else {
        reject(new PasswordHashCapacityError());
      }
    });
  };
}
