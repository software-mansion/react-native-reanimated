import type { BabelFile } from '@babel/core';
import { strict as assert } from 'assert';

import { warnAboutDangerousRelativePaths } from './imports';
import { type WorkletsPluginPass, workletModuleDirective } from './types';

export function initializeState(
  state: WorkletsPluginPass,
  inlineModules: boolean
) {
  state.skipFile = isGeneratedWorkletModule(state.file);
  if (state.skipFile) {
    return;
  }
  state.inlineModules = inlineModules;
  state.workletNumber = 1;

  const userImportForwarding = state.opts.importForwarding;

  warnAboutDangerousRelativePaths(
    userImportForwarding?.relativePaths,
    state.opts.silenceDangerousPathsWarning
  );

  assert(
    state.importForwarding === undefined,
    'state.importForwarding should be undefined at this point'
  );

  state.importForwarding = {
    relativePaths: [
      ...defaultAllowedPaths,
      ...(userImportForwarding?.relativePaths ?? []),
    ],
    moduleNames: [
      ...defaultAllowedModules,
      ...(userImportForwarding?.moduleNames ?? []),
    ],
  };
}

export function isGeneratedWorkletModule(file: BabelFile): boolean {
  return file.ast.program.directives.some(
    (programDirective) =>
      programDirective.value.value === workletModuleDirective
  );
}

const defaultAllowedPaths = ['react-native-worklets'];
const defaultAllowedModules = ['react-native-worklets'];
