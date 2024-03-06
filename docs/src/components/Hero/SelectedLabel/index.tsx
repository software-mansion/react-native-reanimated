import clsx from 'clsx';
import React, { useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';
import SelectionBox, { CornerIdEnum } from './SelectionBox';

const SelectedLabel: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const selectionContainerRef = useRef(null);
  const [sizeStyles, setSizeStyles] = useState({ width: null, height: null });
  const [positionStyles, setPositionStyles] = useState({ top: 0, left: 0 });
  const [minSizeStyles, setMinSizeStyles] = useState({
    minWidth: 0,
    minHeight: 0,
  });

  useEffect(() => {
    const currentWidth = selectionContainerRef.current.clientWidth;
    const currentHeight = selectionContainerRef.current.clientHeight;

    setMinSizeStyles({
      minWidth: currentWidth,
      minHeight: currentHeight,
    });
    setSizeStyles({
      width: currentWidth,
      height: currentHeight,
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
    });
    setSizeStyles({
      width: sizeStyles.width + position.deltaX * resizingDirection.x,
      height: sizeStyles.height + position.deltaY * resizingDirection.y,
    });
  };

  return (
    <span
      className={clsx(styles.headingLabel, styles.selection)}
      style={positionStyles}>
      <div
        className={styles.selectionContainer}
        ref={selectionContainerRef}
        style={{ ...sizeStyles, ...minSizeStyles }}>
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
        {children}
      </div>
    </span>
  );
};

export default SelectedLabel;
