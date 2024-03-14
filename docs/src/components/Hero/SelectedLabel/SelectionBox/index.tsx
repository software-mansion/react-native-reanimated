import clsx from 'clsx';
import React, { useEffect, useMemo, useState } from 'react';
import styles from './styles.module.css';
import Draggable from 'react-draggable';

export enum DraggableId {
  TOP_LEFT,
  TOP_RIGHT,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  CENTER,
}

const SelectionBox: React.FC<{
  propagationFunction: (
    position: { x: number; y: number },
    draggableIdentifier: DraggableId
  ) => void;
  draggableIdentifier: DraggableId;
  children?: React.ReactNode;
  isInteractive: Boolean;
}> = ({
  propagationFunction,
  draggableIdentifier,
  children,
  isInteractive,
}) => {
  let classList = clsx(
    styles.selectionBox,
    draggableIdentifier == DraggableId.BOTTOM_LEFT ||
      draggableIdentifier == DraggableId.BOTTOM_RIGHT
      ? styles.boxLower
      : styles.boxUpper,
    draggableIdentifier == DraggableId.BOTTOM_LEFT ||
      draggableIdentifier == DraggableId.TOP_LEFT
      ? styles.boxLeft
      : styles.boxRight
  );

  if (draggableIdentifier === DraggableId.CENTER) {
    classList = clsx(styles.centerDraggable);
  }

  // use animation with the destination being cursor position
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
      <div className={clsx(isInteractive ? styles.movable : '', classList)}>
        {children}
      </div>
    </Draggable>
  );
};

export default SelectionBox;
