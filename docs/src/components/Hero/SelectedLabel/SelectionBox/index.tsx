import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';
import Draggable from 'react-draggable';

export enum CornerIdEnum {
  TOP_LEFT,
  TOP_RIGHT,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
}

const SelectionBox: React.FC<{
  propagationFunction: (
    position: { deltaX: number; deltaY: number },
    cornerIdentifier: CornerIdEnum
  ) => void;
  cornerIdentifier: CornerIdEnum;
}> = ({ propagationFunction, cornerIdentifier }) => {
  const returnToOrigin = false;

  // set personal css
  const cssSelector = clsx(
    styles.selectionBox,
    cornerIdentifier == CornerIdEnum.BOTTOM_LEFT ||
      cornerIdentifier == CornerIdEnum.BOTTOM_RIGHT
      ? styles.boxLower
      : styles.boxUpper,
    cornerIdentifier == CornerIdEnum.BOTTOM_LEFT ||
      cornerIdentifier == CornerIdEnum.TOP_LEFT
      ? styles.boxLeft
      : styles.boxRight
  );

  enum PositionEnum {
    ABSOLUTE = 'absolute',
    FIXED = 'fixed',
  }

  enum AxisEnum {
    NONE = 'none',
    BOTH = 'both',
  }

  const [draggabilityOptions, setDraggabilityOptions] = useState({
    position: PositionEnum.ABSOLUTE,
    axis: AxisEnum.NONE,
  });
  const [positionStyles, setPositionsStyles] = useState({
    top: null,
    left: null,
  });

  // for the period of being moved, boxes will be completely detached from their surrounding layout
  const detachBox = () => {
    setDraggabilityOptions({
      position: PositionEnum.FIXED,
      axis: AxisEnum.BOTH,
    });
  };

  // after being dropped by the user, boxes are reattached to their surrounding layout
  const attachBox = () => {
    setDraggabilityOptions({
      position: PositionEnum.ABSOLUTE,
      axis: AxisEnum.NONE,
    });
    setPositionsStyles({ top: null, left: null });
  };

  const moveToCursor = (position: { x: number; y: number }) => {
    //setPositionsStyles({top: position.y, left: position.x});
  };

  // use animation with the destination being cursor position
  // todo: detach the grabbed box from website layout, it hinders it's free flow
  return (
    <Draggable
      onDrag={(e, position) => {
        propagationFunction(position, cornerIdentifier);
      }}
      allowAnyClick={false}
      axis={draggabilityOptions.axis}>
      <div
        style={{ position: draggabilityOptions.position }}
        className={cssSelector}></div>
    </Draggable>
  );
};

export default SelectionBox;
