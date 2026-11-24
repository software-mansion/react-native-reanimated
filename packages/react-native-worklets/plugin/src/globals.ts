import { strict as assert } from 'assert';
import path from 'path';

import { warnAboutDangerousRelativePaths } from './imports';
import {
  generatedWorkletsDir,
  type WorkletModulesMode,
  type WorkletsPluginPass,
} from './types';

export function initializeState(
  state: WorkletsPluginPass,
  workletModules: WorkletModulesMode
) {
  state.skipFile = isGeneratedWorkletFile(state.file.opts.filename);
  if (state.skipFile) {
    return;
  }
  state.workletModules = workletModules;
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

export function isGeneratedWorkletFile(
  filename: string | undefined | null
): boolean {
  if (!filename) {
    return false;
  }
  const generatedWorkletsDirPath = path.join(
    'react-native-worklets',
    generatedWorkletsDir
  );
  return filename.includes(generatedWorkletsDirPath);
}

const defaultAllowedPaths = ['react-native-worklets'];
const defaultAllowedModules = ['react-native-worklets'];
