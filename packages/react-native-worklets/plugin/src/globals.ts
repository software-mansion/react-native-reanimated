import type { BabelFile } from '@babel/core';
import { strict as assert } from 'assert';

import { warnAboutDangerousRelativePaths } from './imports';
import {
  type WorkletModulesMode,
  type WorkletsPluginPass,
  workletModuleDirective,
} from './types';

let warnedAboutRemovedOptions = false;

function warnAboutRemovedOptions(options: object): void {
  if (
    warnedAboutRemovedOptions ||
    !('extraPlugins' in options || 'extraPresets' in options)
  ) {
    return;
  }
  warnedAboutRemovedOptions = true;
  console.warn(
    '[Worklets] `extraPlugins` and `extraPresets` were removed in Worklets 1.0 and have no effect. Remove them from your Babel config.'
  );
}

export function initializeState(
  state: WorkletsPluginPass,
  workletModules: WorkletModulesMode
) {
  state.skipFile = isGeneratedWorkletModule(state.file);
  if (state.skipFile) {
    return;
  }
  state.workletModules = workletModules;
  state.workletNumber = 1;

  const userImportForwarding = state.opts.importForwarding;

  warnAboutRemovedOptions(state.opts);

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
