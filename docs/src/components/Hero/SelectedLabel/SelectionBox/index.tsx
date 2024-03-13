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
}> = ({ propagationFunction, draggableIdentifier, children }) => {
  const [classList, setClassList] = useState('');

  useEffect(() => {
    setClassList(
      draggableIdentifier == DraggableId.CENTER
        ? clsx(styles.movableHeader, styles.movable)
        : clsx(
            styles.selectionBox,
            styles.movable,
            draggableIdentifier == DraggableId.BOTTOM_LEFT ||
              draggableIdentifier == DraggableId.BOTTOM_RIGHT
              ? styles.boxLower
              : styles.boxUpper,
            draggableIdentifier == DraggableId.BOTTOM_LEFT ||
              draggableIdentifier == DraggableId.TOP_LEFT
              ? styles.boxLeft
              : styles.boxRight
          )
    );
  }, []);

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
      <div className={classList}>{children}</div>
    </Draggable>
  );
};

export default SelectionBox;
