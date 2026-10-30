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

export type TransformObservation = {
  translateX: number;
};

export interface Spec extends TurboModule {
  observeTransform(
    tag: CodegenTypes.Int32
  ): Promise<TransformObservation | null>;

  observeTextInput(
    tag: CodegenTypes.Int32
  ): Promise<TextInputObservation | null>;
}

export default TurboModuleRegistry.get<Spec>('RuntimeTestObserver');
