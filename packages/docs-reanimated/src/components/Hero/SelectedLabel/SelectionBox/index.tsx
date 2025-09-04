import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import { useDraggable, useDndMonitor } from '@dnd-kit/core';
import styles from './styles.module.css';

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
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: draggableIdentifier.toString(),
  });

  const lastDelta = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!transform || !isInteractive) return;

    const dx = transform.x - lastDelta.current.x;
    const dy = transform.y - lastDelta.current.y;

    if (dx !== 0 || dy !== 0) {
      propagationFunction({ x: dx, y: dy }, draggableIdentifier);
      lastDelta.current = { x: transform.x, y: transform.y };
    }
  }, [transform, isInteractive, draggableIdentifier, propagationFunction]);

  useDndMonitor({
    onDragEnd(event) {
      if (event.active.id === draggableIdentifier.toString()) {
        lastDelta.current = { x: 0, y: 0 };
      }
    }
  });

  const classList = getClassListByIdentifier(draggableIdentifier, isInteractive);


  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={classList}
      style={{ touchAction: "none" }}
    >
      {children}
    </div>
  );
};

export default SelectionBox;
