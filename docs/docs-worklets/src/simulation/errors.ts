export class SnippetError extends Error {
  line: number | undefined;

  constructor(message: string, line?: number) {
    super(line === undefined ? message : `${message} (line ${line})`);
    this.name = 'SnippetError';
    this.line = line;
  }
}
