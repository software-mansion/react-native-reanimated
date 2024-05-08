import clsx from 'clsx';
import React from 'react';
import styles from './styles.module.css';
import Draggable from 'react-draggable';

export enum DraggableId {
  TOP_LEFT,
  TOP_RIGHT,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  CENTER,
}

const getClassListByIdentifier = (
  identifier: DraggableId,
  isInteractive: boolean
) => {
  const isBottom =
    identifier == DraggableId.BOTTOM_LEFT ||
    identifier == DraggableId.BOTTOM_RIGHT;
  const isLeft =
    identifier == DraggableId.BOTTOM_LEFT || identifier == DraggableId.TOP_LEFT;
  const isCenter = identifier === DraggableId.CENTER;

  let classList = styles.centerDraggable;

  if (!isCenter) {
    classList = clsx(
      styles.selectionBox,
      isBottom ? styles.boxLower : styles.boxUpper,
      isLeft ? styles.boxLeft : styles.boxRight
    );
  }

  if (isInteractive) {
    classList = clsx(classList, styles.movable);
  }

  return classList;
};

const SelectionBox: React.FC<{
  propagationFunction: (
    movementDelta: { x: number; y: number },
    draggableIdentifier: DraggableId
  ) => void;
  draggableIdentifier: DraggableId;
  children?: React.ReactNode;
  isInteractive: boolean;
}> = ({
  propagationFunction,
  draggableIdentifier,
  children,
  isInteractive,
}) => {
  const classList = getClassListByIdentifier(
    draggableIdentifier,
    isInteractive
  );

  return (
    <Draggable
      onDrag={(event: any) => {
        propagationFunction(
          { x: event.movementX, y: event.movementY },
          draggableIdentifier
        );
      }}
      allowAnyClick={false}
      axis={'none'}>
      <div className={classList}>{children}</div>
    </Draggable>
  );
};

export default SelectionBox;
