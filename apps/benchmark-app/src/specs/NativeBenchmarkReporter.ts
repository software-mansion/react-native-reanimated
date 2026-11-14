import type { TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export interface Spec extends TurboModule {
  report(line: string): void;
  markReady(): number;
  currentEpochLoad(): string;
}

export default TurboModuleRegistry.getEnforcing<Spec>('BenchmarkReporter');
