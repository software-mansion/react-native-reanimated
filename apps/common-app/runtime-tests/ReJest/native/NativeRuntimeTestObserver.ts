import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type TextInputObservation = {
  accessibilityLabel: string | null;
  /**
   * Android only. iOS returns null because this observer does not read the
   * color.
   */
  placeholderTextColor: string | null;
};

export interface Spec extends TurboModule {
  observeTextInput(
    tag: CodegenTypes.Int32
  ): Promise<TextInputObservation | null>;
}

export default TurboModuleRegistry.get<Spec>('RuntimeTestObserver');
