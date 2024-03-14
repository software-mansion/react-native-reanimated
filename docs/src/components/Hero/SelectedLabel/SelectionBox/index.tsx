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
    const isBottom = draggableIdentifier == DraggableId.BOTTOM_LEFT ||
      draggableIdentifier == DraggableId.BOTTOM_RIGHT;
    const isLeft = draggableIdentifier == DraggableId.BOTTOM_LEFT ||
      draggableIdentifier == DraggableId.TOP_LEFT;
    const isCenter = draggableIdentifier === DraggableId.CENTER;

    let classList = clsx(
      styles.selectionBox,
      isBottom
        ? styles.boxLower
        : styles.boxUpper,
      isLeft
        ? styles.boxLeft
        : styles.boxRight
    );

    classList = isCenter ? clsx(styles.centerDraggable) : classList;

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
