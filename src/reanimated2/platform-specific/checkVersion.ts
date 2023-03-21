import { checkCppVersion } from './checkCppVersion';
import { checkPluginVersion } from './checkPluginVersion';

function checkVersion(): void {
  checkCppVersion();
  checkPluginVersion();
}

export { checkVersion };
