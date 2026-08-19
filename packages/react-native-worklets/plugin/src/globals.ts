import { strict as assert } from 'assert';
import path from 'path';

import { generatedWorkletsDir, type WorkletsPluginPass } from './types';

export function initializeState(state: WorkletsPluginPass) {
  state.skipFile = isGeneratedWorkletFile(state.file.opts.filename);
  if (state.skipFile) {
    return;
  }
  state.workletNumber = 1;

  const userImportForwarding = state.opts.importForwarding;

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
const defaultAllowedModules = [
  'react-native-worklets',
  'react-native/Libraries/Core/setUpXHR',
];
