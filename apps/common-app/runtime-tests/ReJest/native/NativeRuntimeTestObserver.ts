import type { CodegenTypes, TurboModule } from 'react-native';
import { TurboModuleRegistry } from 'react-native';

export type TextInputObservation = {
  accessibilityLabel: string | null;
  /** Android only. Counts native accessibilityLabel setter calls. */
  labelSetterCalls: number | null;
  /**
   * Android only. iOS returns null because this observer does not read the
   * color.
   */
  placeholderTextColor: string | null;
};

/** The origin of the view on the screen, without its own transform. */
export type ScreenLocation = {
  x: number;
  y: number;
};

export type TransformObservation = {
  width: number;
  translateX: number;
  /**
   * The 4x4 matrix in the layout of React Native. Android gives only the 2D
   * part: translation, scale and rotation about z.
   */
  matrix: ReadonlyArray<number>;
};

/** A Remove that the iOS mounting layer applied. */
export type UnmountObservation = {
  parentTag: number;
  childTag: number;
};

export interface Spec extends TurboModule {
  emitScreenTransitionProgress(
    tag: CodegenTypes.Int32,
    progress: number,
    closing: boolean,
    goingForward: boolean
  ): Promise<void>;

  emitScreenGestureCancel(tag: CodegenTypes.Int32): Promise<void>;

  /** Returns null when the parent of the mounted view is not a React view. */
  observeParent(tag: CodegenTypes.Int32): Promise<number | null>;

  observeLocationOnScreen(
    tag: CodegenTypes.Int32
  ): Promise<ScreenLocation | null>;

  observeTransform(
    tag: CodegenTypes.Int32
  ): Promise<TransformObservation | null>;

  observeTextInput(
    tag: CodegenTypes.Int32
  ): Promise<TextInputObservation | null>;

  startUnmountRecording(): Promise<void>;

  /** Returns the Removes since the start in mount order. Android returns null. */
  takeUnmountRecording(): Promise<ReadonlyArray<UnmountObservation> | null>;
}

export default TurboModuleRegistry.get<Spec>('RuntimeTestObserver');
