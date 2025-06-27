import { DraggableId } from './SelectionBox';

export type DynamicStyles = {
  top: number;
  left: number;
  width: number;
  height: number;
};

export type StaticStyles = {
  initialWidth: number;
  initialHeight: number;
};

export type TextScaleStyles = {
  x: number;
  y: number;
};

const SCALING_OFFSET_X = 1.0;
const SCALING_OFFSET_Y = 1.22;

export const computeSelectionStyles = (
  position: { x: number; y: number },
  draggableIdentifier: DraggableId,
  dynamicStyles
): DynamicStyles => {
  const isLeft =
    draggableIdentifier === DraggableId.BOTTOM_LEFT ||
    draggableIdentifier === DraggableId.TOP_LEFT;
  const isTop =
    draggableIdentifier === DraggableId.TOP_LEFT ||
    draggableIdentifier === DraggableId.TOP_RIGHT;
  const isCenter = draggableIdentifier === DraggableId.CENTER;

  // depedning on whether draggable is on left, right, top or bottom,
  // we want to either resize, or move and resize our object
  const positionAdjustment = {
    x: isLeft ? position.x : 0,
    y: isTop ? position.y : 0,
  };

  const sizeChange = {
    x: isLeft ? -position.x : position.x,
    y: isTop ? -position.y : position.y,
  };

  // adjust variables when dragging the center
  if (isCenter) {
    positionAdjustment.x = sizeChange.x;
    positionAdjustment.y = sizeChange.y;
    sizeChange.x = 0;
    sizeChange.y = 0;
  }

  // stop overreduction in size
  if (dynamicStyles.width + sizeChange.x < 0)
    sizeChange.x = -dynamicStyles.width;
  if (dynamicStyles.height + sizeChange.y < 0)
    sizeChange.y = -dynamicStyles.height;

  // stop dragging a minimized object
  if (!isCenter) {
    if (dynamicStyles.width - positionAdjustment.x < 0)
      positionAdjustment.x = 0;
    if (dynamicStyles.height - positionAdjustment.y < 0)
      positionAdjustment.y = 0;
  }

  return {
    left: dynamicStyles.left + positionAdjustment.x,
    top: dynamicStyles.top + positionAdjustment.y,
    width: dynamicStyles.width + sizeChange.x,
    height: dynamicStyles.height + sizeChange.y,
  };
};

export const computeTextStyles = (
  dynamicStyles: DynamicStyles,
  staticStyles: StaticStyles
): TextScaleStyles => {
  // these magic numbers are a result of disparity between font's apparent and actual size
  const scaleOffsetX = SCALING_OFFSET_X;
  const scaleOffsetY = SCALING_OFFSET_Y;

  // scale starts at 1 and as it gets larger approaches sizeOffset
  const textScale = {
    x:
      (dynamicStyles.width / staticStyles.initialWidth) * scaleOffsetX -
      scaleOffsetX +
      1,
    y:
      (dynamicStyles.height / staticStyles.initialHeight) * scaleOffsetY -
      scaleOffsetY +
      1,
  };

  // prevent text overadjustment
  if (textScale.x < 0) textScale.x = 0;
  if (textScale.y < 0) textScale.y = 0;

  return textScale;
};
