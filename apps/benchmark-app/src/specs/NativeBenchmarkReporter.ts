import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  report(line: string): void;
  currentThreadId(): number;
}

export default TurboModuleRegistry.getEnforcing<Spec>('BenchmarkReporter');
