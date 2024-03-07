import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';
import SelectionBox, { CornerIdEnum } from './SelectionBox';

const SelectedLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const selectionContainerRef = useRef(null);
  const [positionStyles, setPositionStyles] = useState({
    top: 0,
    left: 0,
    width: null,
    height: null,
  });
  const [constantStyles, setConstantStyles] = useState({
    initialWidth: null,
    initialHeight: null,
    setAbsolute: false,
  });

  useEffect(() => {
    const rect = selectionContainerRef.current.getBoundingClientRect();
    setPositionStyles({
      top: 0, // rect.top,
      left: 0, // rect.left,
      width: rect.width,
      height: rect.height,
    });
    setConstantStyles({
      initialWidth: rect.width,
      initialHeight: rect.height,
      setAbsolute: true,
    });
  }, []);

  let positionPropagator = (
    position: { x: number; y: number },
    cornerIdentifier: CornerIdEnum
  ) => {
    // changing selectionContainer will automatically adjust position of selectionBoxes as well
    // all changes are done through css
    const dirHorizontal =
      cornerIdentifier == CornerIdEnum.BOTTOM_LEFT ||
      cornerIdentifier == CornerIdEnum.TOP_LEFT;
    const dirVertical =
      cornerIdentifier == CornerIdEnum.TOP_LEFT ||
      cornerIdentifier == CornerIdEnum.TOP_RIGHT;

    const positionAdjustment = {
      x: dirHorizontal ? position.x : 0,
      y: dirVertical ? position.y : 0,
    };
    const resizingDirection = {
      x: dirHorizontal ? -1 : 1,
      y: dirVertical ? -1 : 1,
    };
    const sizeChange = {
      x: position.x * resizingDirection.x,
      y: position.y * resizingDirection.y,
    };

    // adjust variables when dragging the center
    if (cornerIdentifier == CornerIdEnum.CENTER) {
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
    if (positionStyles.width - positionAdjustment.x < 0)
      positionAdjustment.x = 0;
    if (positionStyles.height - positionAdjustment.y < 0)
      positionAdjustment.y = 0;

    setPositionStyles({
      left: positionStyles.left + positionAdjustment.x,
      top: positionStyles.top + positionAdjustment.y,
      width: positionStyles.width + sizeChange.x,
      height: positionStyles.height + sizeChange.y,
    });
  };

  const textScale = {
    x: (positionStyles.width / constantStyles.initialWidth) * 0.94 + 0.06,
    y: (positionStyles.height / constantStyles.initialHeight) * 1.1 - 0.1,
  };

  if (textScale.x < 0) textScale.x = 0;
  if (textScale.y < 0) textScale.y = 0;

  return (
    <span
      className={clsx(styles.headingLabel, styles.selection)}
      style={{
        transform: `translate(${positionStyles.left}px, ${positionStyles.top}px)`,
        position: constantStyles.setAbsolute ? 'absolute' : 'relative',
      }}>
      <div
        className={styles.selectionContainer}
        ref={selectionContainerRef}
        style={{
          width: positionStyles.width,
          height: positionStyles.height,
        }}>
        <SelectionBox
          propagationFunction={positionPropagator}
          cornerIdentifier={CornerIdEnum.TOP_LEFT}></SelectionBox>
        <SelectionBox
          propagationFunction={positionPropagator}
          cornerIdentifier={CornerIdEnum.TOP_RIGHT}></SelectionBox>
        <SelectionBox
          propagationFunction={positionPropagator}
          cornerIdentifier={CornerIdEnum.BOTTOM_LEFT}></SelectionBox>
        <SelectionBox
          propagationFunction={positionPropagator}
          cornerIdentifier={CornerIdEnum.BOTTOM_RIGHT}></SelectionBox>
        <SelectionBox
          propagationFunction={positionPropagator}
          cornerIdentifier={CornerIdEnum.CENTER}>
          <span
            style={{
              position: constantStyles.setAbsolute ? 'absolute' : 'relative',
              transform: `translate(-50%, -50%) scale(${textScale.x}, ${textScale.y})`,
              userSelect: 'none',
            }}>
            {children}
          </span>
        </SelectionBox>
      </div>
    </span>
  );
};

export default SelectedLabel;
