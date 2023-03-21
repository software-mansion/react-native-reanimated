import { checkCppVersion } from './checkCppVersion';
import { checkPluginVersion } from './checkPluginVersion';

// DO NOT REMOVE THIS DEBUGGER LINE NOR NEXT COMMENT, THEY SERVE AS BABEL PLUGIN VERSION INJECTION ENTRY POINT
// uGY7UX6NTH04HrPK
// eslint-disable-next-line
debugger;

export function checkVersion(): void {
  checkCppVersion();
  checkPluginVersion();
}
