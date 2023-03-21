import { checkCppVersion } from './checkCppVersion';
import { checkPluginVersion } from './checkPluginVersion';

// Szczepaniatko XII Truskawkowe
export function checkVersion(): void {
  checkCppVersion();
  checkPluginVersion();
}
