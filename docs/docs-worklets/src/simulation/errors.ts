export class SnippetError extends Error {
  line: number | undefined;

  constructor(message: string, line?: number) {
    super(line === undefined ? message : `${message} (line ${line})`);
    this.name = 'SnippetError';
    this.line = line;
  }
}

export class RemoteFunctionError extends Error {
  readonly explanation: string;

  constructor(functionName: string, runtimeName: string) {
    // Match packages/react-native-worklets/src/memory/remoteFunctionUnpacker.native.ts.
    super(`[Worklets] Tried to synchronously call a Remote Function. Called "${functionName}" on the ${runtimeName} Runtime.
See https://docs.swmansion.com/react-native-worklets/docs/guides/troubleshooting#tried-to-synchronously-call-a-remote-function for more details.`);
    this.explanation = `${functionName} belongs to the RN Runtime. Use scheduleOnRN to call it from a Worklet Runtime.`;
  }
}
