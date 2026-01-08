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

// Get viewport dimensions for boundary checks
const getViewportBounds = () => {
  if (typeof window !== 'undefined') {
    return {
      width: window.innerWidth,
      height: window.innerHeight,
    };
  }
  return { width: 9999, height: 9999 }; // fallback for SSR
};

export const computeSelectionStyles = (
  position: { x: number; y: number },
  draggableIdentifier: DraggableId,
  dynamicStyles
): DynamicStyles => {
  const viewport = getViewportBounds();
  
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

  // Calculate new position
  let newLeft = dynamicStyles.left + positionAdjustment.x;
  let newTop = dynamicStyles.top + positionAdjustment.y;
  const newWidth = dynamicStyles.width + sizeChange.x;
  const newHeight = dynamicStyles.height + sizeChange.y;

  // Prevent dragging outside viewport boundaries
  // Add padding to keep element at least partially visible
  const minVisiblePortion = 50; // Minimum pixels that must remain visible
  
  // Constrain left/right movement
  if (newLeft < -newWidth + minVisiblePortion) {
    newLeft = -newWidth + minVisiblePortion;
  }
  if (newLeft > viewport.width - minVisiblePortion) {
    newLeft = viewport.width - minVisiblePortion;
  }
  
  // Constrain top/bottom movement
  if (newTop < -newHeight + minVisiblePortion) {
    newTop = -newHeight + minVisiblePortion;
  }
  if (newTop > viewport.height - minVisiblePortion) {
    newTop = viewport.height - minVisiblePortion;
  }

  return {
    left: newLeft,
    top: newTop,
    width: newWidth,
    height: newHeight,
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
