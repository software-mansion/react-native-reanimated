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

/**
 * The frame of the view in the window and its opacity with the opacity of its
 * ancestors, as the screen shows them.
 */
export type PresentedFrame = {
  x: number;
  y: number;
  width: number;
  height: number;
  opacity: number;
  /** True while UIKit runs a transition of a view controller of the view. */
  inContainerTransition: boolean;
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

  /**
   * IOS only. Moves the native view between the mounted view and its React
   * parent down by `y`. The screen shows `presentedY` until the next call, as
   * during a Core Animation animation.
   */
  translateNativeParent(
    tag: CodegenTypes.Int32,
    y: number,
    presentedY: number
  ): Promise<void>;

  /**
   * IOS only. Records the presented frames of the views in each callback of a
   * display link until `takeFrameRecording`. The display link can skip frames.
   */
  startFrameRecording(tags: ReadonlyArray<CodegenTypes.Int32>): Promise<void>;

  /**
   * Returns one sample for each callback of the display link, with one entry
   * for each tag. The entry is null when the view is not in a window. Android
   * returns null.
   */
  takeFrameRecording(): Promise<ReadonlyArray<
    ReadonlyArray<PresentedFrame | null>
  > | null>;

  startUnmountRecording(): Promise<void>;

  /** Returns the Removes since the start in mount order. Android returns null. */
  takeUnmountRecording(): Promise<ReadonlyArray<UnmountObservation> | null>;
}

export default TurboModuleRegistry.get<Spec>('RuntimeTestObserver');
