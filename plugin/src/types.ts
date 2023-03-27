import * as BabelCore from '@babel/core';

export interface ReanimatedPluginPass {
  file: BabelCore.BabelFile;
  key: string;
  opts: {
    relativeSourceLocation?: boolean;
    disableInlineStylesWarning?: boolean;
  };
  cwd: string;
  filename: string | undefined;
  get(key: unknown): unknown;
  set(key: unknown, value: unknown): void;
  [key: string]: unknown;
}
