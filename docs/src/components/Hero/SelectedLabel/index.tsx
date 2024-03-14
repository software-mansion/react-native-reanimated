import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import styles from './styles.module.css';
import SelectionBox, { DraggableId } from './SelectionBox';

const SelectedLabel: React.FC<{
  children: React.ReactNode;
  isInteractive: Boolean;
}> = ({ children, isInteractive = false }) => {
  type PositionStyles = {
    top: number;
    left: number;
    width: number;
    height: number;
  };

  // DOM refs
  const selectionRef = useRef(null);
  const selectionContainerRef = useRef(null);
  const textLabelRef = useRef(null);

  // Render-persistent label positioning styles
  const positionStyles = useRef<PositionStyles>({
    top: 0,
    left: 0,
    width: null,
    height: null,
  });

  const constantStyles = useRef({
    initialWidth: null,
    initialHeight: null,
    enabledTextInteractivity: false,
  });

  const applyPositionStyles = (newPositionStyles: PositionStyles) => {
    const currentPositionStyles = positionStyles.current;

    // save changes
    currentPositionStyles.top = newPositionStyles.top;
    currentPositionStyles.left = newPositionStyles.left;
    currentPositionStyles.width = newPositionStyles.width;
    currentPositionStyles.height = newPositionStyles.height;

    // apply changes to refs
    selectionRef.current.style.transform = `translate(${currentPositionStyles.left}px, ${currentPositionStyles.top}px)`;
    selectionContainerRef.current.style.width = `${currentPositionStyles.width}px`;
    selectionContainerRef.current.style.height = `${currentPositionStyles.height}px`;
  };

  const applyTextScale = (scaleObject: { x: number; y: number }) => {
    textLabelRef.current.style.transform = `translate(-50%, -50%) scale(${scaleObject.x}, ${scaleObject.y})`;
  };

  useEffect(() => {
    if (!isInteractive) return;

    let rect = selectionContainerRef.current.getBoundingClientRect();
    constantStyles.current = {
      initialWidth: rect.width,
      initialHeight: rect.height,
      enabledTextInteractivity: true,
    };

    applyPositionStyles({
      top: 0,
      left: 0,
      width: rect.width,
      height: rect.height,
    });
  }, []);

  const computeSelectionStyles = (
    position: { x: number; y: number },
    draggableIdentifier: DraggableId
  ) => {
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

    const currentPositionStyles = positionStyles.current;

    // stop overreduction in size
    if (currentPositionStyles.width + sizeChange.x < 0)
      sizeChange.x = -currentPositionStyles.width;
    if (currentPositionStyles.height + sizeChange.y < 0)
      sizeChange.y = -currentPositionStyles.height;

    // stop dragging a minimized object
    if (!isCenter) {
      if (currentPositionStyles.width - positionAdjustment.x < 0)
        positionAdjustment.x = 0;
      if (currentPositionStyles.height - positionAdjustment.y < 0)
        positionAdjustment.y = 0;
    }

    applyPositionStyles({
      left: currentPositionStyles.left + positionAdjustment.x,
      top: currentPositionStyles.top + positionAdjustment.y,
      width: currentPositionStyles.width + sizeChange.x,
      height: currentPositionStyles.height + sizeChange.y,
    });
  };

  const computeTextStyles = () => {
    // these magic numbers are a result of disparity between font's apparent and actual size
    const sizeOffsetX = 0.99;
    const sizeOffsetY = 1.21;

    // scale starts at 1 and as it gets larger approaches sizeOffset
    const textScale = {
      x:
        (positionStyles.current.width / constantStyles.current.initialWidth) *
          sizeOffsetX -
        sizeOffsetX +
        1,
      y:
        (positionStyles.current.height / constantStyles.current.initialHeight) *
          sizeOffsetY -
        sizeOffsetY +
        1,
    };

    // prevent text overadjustment
    if (textScale.x < 0) textScale.x = 0;
    if (textScale.y < 0) textScale.y = 0;

    applyTextScale(textScale);
  };

  const movementPropagator = (
    movementDelta: { x: number; y: number },
    draggableIdentifier: DraggableId
  ) => {
    if (!isInteractive) return;

    computeSelectionStyles(movementDelta, draggableIdentifier);
    computeTextStyles();
  };

  return (
    <span
      ref={selectionRef}
      className={clsx(styles.headingLabel, styles.selection)}
      style={{
        position: constantStyles.current.enabledTextInteractivity
          ? 'absolute'
          : 'relative',
      }}>
      <div ref={selectionContainerRef} className={styles.selectionContainer}>
        <SelectionBox
          propagationFunction={movementPropagator}
          draggableIdentifier={DraggableId.TOP_LEFT}
          isInteractive={isInteractive}></SelectionBox>
        <SelectionBox
          propagationFunction={movementPropagator}
          draggableIdentifier={DraggableId.TOP_RIGHT}
          isInteractive={isInteractive}></SelectionBox>
        <SelectionBox
          propagationFunction={movementPropagator}
          draggableIdentifier={DraggableId.BOTTOM_LEFT}
          isInteractive={isInteractive}></SelectionBox>
        <SelectionBox
          propagationFunction={movementPropagator}
          draggableIdentifier={DraggableId.BOTTOM_RIGHT}
          isInteractive={isInteractive}></SelectionBox>
        <SelectionBox
          propagationFunction={movementPropagator}
          draggableIdentifier={DraggableId.CENTER}
          isInteractive={isInteractive}>
          <span
            ref={textLabelRef}
            className={clsx(
              isInteractive ? styles.preEnabledTextInteractivity : null,
              constantStyles.current.enabledTextInteractivity
                ? styles.interactiveHeaderText
                : styles.headerText
            )}>
            {children}
          </span>
        </SelectionBox>
      </div>
    </span>
  );
};

export default SelectedLabel;
