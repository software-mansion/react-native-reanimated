import { checkCppVersion } from './checkCppVersion';
import { checkPluginVersion } from './checkPluginVersion';

export function checkVersion(): void {
  checkCppVersion();
  checkPluginVersion();
}
