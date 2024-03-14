import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';
import SelectionBox, { DraggableId } from './SelectionBox';

const SelectedLabel: React.FC<{ children: React.ReactNode, isInteractive: Boolean }> = ({
  children,
  isInteractive = false
}) => {
  const selectionRef = useRef(null);
  const selectionContainerRef = useRef(null);
  const textLabelRef = useRef(null);

  const positionStyles = {
    top: 0,
    left: 0,
    width: null,
    height: null,
  };
  const setPositionStyles = (newPositionStyles: {
    top: number;
    left: number;
    width: number;
    height: number;
  }) => {
    // save changes
    positionStyles.top = newPositionStyles.top;
    positionStyles.left = newPositionStyles.left;
    positionStyles.width = newPositionStyles.width;
    positionStyles.height = newPositionStyles.height;

    // apply changes to refs
    selectionRef.current.style.transform = `translate(${positionStyles.left}px, ${positionStyles.top}px)`;
    selectionContainerRef.current.style.width = `${positionStyles.width}px`;
    selectionContainerRef.current.style.height = `${positionStyles.height}px`;
  };

  const textScale = {
    x: 1,
    y: 1,
  };
  const applyTextScale = () => {
    textLabelRef.current.style.transform = `translate(-50%, -50%) scale(${textScale.x}, ${textScale.y})`;
  };

  const [constantStyles, setConstantStyles] = useState({
    initialWidth: null,
    initialHeight: null,
    isTextInteractive: false,
  });

  useEffect(() => {    
    if (!isInteractive)
      return;

    const rect = selectionContainerRef.current.getBoundingClientRect();
    setConstantStyles({
      initialWidth: rect.width,
      initialHeight: rect.height,
      isTextInteractive: true,
    });
  }, []);

  useEffect(() => {
    if (!isInteractive)
      return;

    const rect = selectionContainerRef.current.getBoundingClientRect();
    setPositionStyles({
      top: 0,
      left: 0,
      width: rect.width,
      height: rect.height,
    });
  }, [constantStyles]);

  const positionPropagator = (
    position: { x: number; y: number },
    draggableIdentifier: DraggableId
  ) => {
    if (!isInteractive)
      return;

    const isHorizontal =
      draggableIdentifier == DraggableId.BOTTOM_LEFT ||
      draggableIdentifier == DraggableId.TOP_LEFT;
    const isVertical =
      draggableIdentifier == DraggableId.TOP_LEFT ||
      draggableIdentifier == DraggableId.TOP_RIGHT;

    const positionAdjustment = {
      x: isHorizontal ? position.x : 0,
      y: isVertical ? position.y : 0,
    };
    const resizingDirection = {
      x: isHorizontal ? -1 : 1,
      y: isVertical ? -1 : 1,
    };
    const sizeChange = {
      x: position.x * resizingDirection.x,
      y: position.y * resizingDirection.y,
    };

    // adjust variables when dragging the center
    if (draggableIdentifier == DraggableId.CENTER) {
      positionAdjustment.x = sizeChange.x;
      positionAdjustment.y = sizeChange.y;
      sizeChange.x = 0;
      sizeChange.y = 0;
    }

    // stop overreduction in size
    if (positionStyles.width + sizeChange.x < 0)
      sizeChange.x = -positionStyles.width;
    if (positionStyles.height + sizeChange.y < 0)
      sizeChange.y = -positionStyles.height;

    // stop dragging a minimized object
    if (draggableIdentifier !== DraggableId.CENTER) {
      if (positionStyles.width - positionAdjustment.x < 0)
        positionAdjustment.x = 0;
      if (positionStyles.height - positionAdjustment.y < 0)
        positionAdjustment.y = 0;
    }

    setPositionStyles({
      left: positionStyles.left + positionAdjustment.x,
      top: positionStyles.top + positionAdjustment.y,
      width: positionStyles.width + sizeChange.x,
      height: positionStyles.height + sizeChange.y,
    });

    // these magic numbers are a result of disparity between font's apparent and actual size
    const sizeOffsetX = 0.93;
    const sizeOffsetY = 1.255;
    // scale starts at 1 and as it gets larger approaches sizeOffset
    textScale.x =
      (positionStyles.width / constantStyles.initialWidth) * sizeOffsetX - sizeOffsetX + 1;
    textScale.y =
      (positionStyles.height / constantStyles.initialHeight) * sizeOffsetY - sizeOffsetY + 1;

    if (textScale.x < 0) textScale.x = 0;
    if (textScale.y < 0) textScale.y = 0;

    applyTextScale();
  };

  return (
    <span
      ref={selectionRef}
      className={clsx(styles.headingLabel, styles.selection)}
      style={{
        position: constantStyles.isTextInteractive ? 'absolute' : 'relative',
      }}>
      <div ref={selectionContainerRef} className={styles.selectionContainer}>
        <SelectionBox
          propagationFunction={positionPropagator}
          draggableIdentifier={DraggableId.TOP_LEFT}
          isInteractive={isInteractive}></SelectionBox>
        <SelectionBox
          propagationFunction={positionPropagator}
          draggableIdentifier={DraggableId.TOP_RIGHT}
          isInteractive={isInteractive}></SelectionBox>
        <SelectionBox
          propagationFunction={positionPropagator}
          draggableIdentifier={DraggableId.BOTTOM_LEFT}
          isInteractive={isInteractive}></SelectionBox>
        <SelectionBox
          propagationFunction={positionPropagator}
          draggableIdentifier={DraggableId.BOTTOM_RIGHT}
          isInteractive={isInteractive}></SelectionBox>
        <SelectionBox
          propagationFunction={positionPropagator}
          draggableIdentifier={DraggableId.CENTER}
          isInteractive={isInteractive}>
          <span
            ref={textLabelRef}
            className={clsx(
              constantStyles.isTextInteractive ? styles.interactiveHeaderText : styles.headerText
            )}>
            {children}
          </span>
        </SelectionBox>
      </div>
    </span>
  );
};

export default SelectedLabel;
