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
    minWidth: null,
    minHeight: null,
    setAbsolute: false,
  });

  useEffect(() => {
    const rect = selectionContainerRef.current.getBoundingClientRect();
    console.log(rect);
    setPositionStyles({
      top: 0, // rect.top,
      left: 0, // rect.left,
      width: rect.width,
      height: rect.height,
    });
    setConstantStyles({
      minWidth: rect.width,
      minHeight: rect.height,
      setAbsolute: true,
    });
  }, []);

  let positionPropagator = (
    position: { deltaX: number; deltaY: number },
    cornerIdentifier: CornerIdEnum
  ) => {
    // changing selectionContainer will automatically adjust position of selectionBoxes as well
    // all changes are done through css
    const dirHorizontal =
      cornerIdentifier == CornerIdEnum.BOTTOM_LEFT ||
      cornerIdentifier == CornerIdEnum.TOP_LEFT;
    const dirVertical =
      cornerIdentifier == CornerIdEnum.BOTTOM_LEFT ||
      cornerIdentifier == CornerIdEnum.BOTTOM_RIGHT;

    const positionAdjustment = {
      x: dirHorizontal ? position.deltaX : 0,
      y: dirVertical ? 0 : position.deltaY,
    };
    const resizingDirection = {
      x: dirHorizontal ? -1 : 1,
      y: dirVertical ? 1 : -1,
    };

    setPositionStyles({
      left: positionStyles.left + positionAdjustment.x,
      top: positionStyles.top + positionAdjustment.y,
      width: positionStyles.width + position.deltaX * resizingDirection.x,
      height: positionStyles.height + position.deltaY * resizingDirection.y,
    });
  };

  const textScale = {
    x: positionStyles.width / constantStyles.minWidth,
    y: positionStyles.height / constantStyles.minHeight,
  };

  let smallerScale = textScale.x < textScale.y ? textScale.x : textScale.y;
  if (smallerScale < 1) smallerScale = 1;

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
          ...constantStyles,
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
        <span
          className={styles.movableHeader}
          style={{
            position: constantStyles.setAbsolute ? 'absolute' : 'relative',
            transform: `translate(-50%, -50%) scale(${smallerScale})`,
          }}>
          {children}
        </span>
      </div>
    </span>
  );
};

export default SelectedLabel;
