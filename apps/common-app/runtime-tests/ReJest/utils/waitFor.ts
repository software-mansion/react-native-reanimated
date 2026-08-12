export const DEFAULT_TIMEOUT_MS = 10000;
const DEFAULT_POLL_INTERVAL_MS = 10;

type WaitForOptions = {
  description: string;
  timeout?: number;
  interval?: number;
  describeState?: () => string | Promise<string>;
};

type WithTimeoutOptions = {
  description: string;
  timeout?: number;
};

export function sleep(delay: number) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}

export async function waitFor(
  predicate: () => boolean | Promise<boolean>,
  {
    description,
    timeout = DEFAULT_TIMEOUT_MS,
    interval = DEFAULT_POLL_INTERVAL_MS,
    describeState,
  }: WaitForOptions
) {
  const startTime = performance.now();

  for (;;) {
    if (await predicate()) {
      return;
    }
    if (performance.now() - startTime >= timeout) {
      throw new Error(
        timeoutMessage(
          timeout,
          description,
          describeState ? await describeState() : undefined
        )
      );
    }
    await sleep(interval);
  }
}

export async function withTimeout<TValue>(
  promise: Promise<TValue>,
  { description, timeout = DEFAULT_TIMEOUT_MS }: WithTimeoutOptions
) {
  let timeoutHandle: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(new Error(timeoutMessage(timeout, description)));
    }, timeout);
  });

  try {
    return await Promise.race([promise, timeoutPromise]);
  } finally {
    clearTimeout(timeoutHandle);
  }
}

function timeoutMessage(timeout: number, description: string, state?: string) {
  const observed = state ? ` Last observed: ${state}.` : '';
  return `Timed out after ${timeout}ms while waiting for ${description}.${observed}`;
}
