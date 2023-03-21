import { checkCppVersion } from './checkCppVersion';
import { checkPluginVersion } from './checkPluginVersion';

// Szczepaniatko XII Truskawkowe
// eslint-disable-next-line
debugger;
export function checkVersion(): void {
  checkCppVersion();
  checkPluginVersion();
}
