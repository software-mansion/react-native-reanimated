import clsx from 'clsx';
import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';
import Draggable from 'react-draggable';

export enum CornerIdEnum {
  TOP_LEFT,
  TOP_RIGHT,
  BOTTOM_LEFT,
  BOTTOM_RIGHT,
  CENTER,
}

const SelectionBox: React.FC<{
  propagationFunction: (
    position: { x: number; y: number },
    cornerIdentifier: CornerIdEnum
  ) => void;
  cornerIdentifier: CornerIdEnum;
  children?: React.ReactNode;
}> = ({ propagationFunction, cornerIdentifier, children }) => {
  const [classList, setClassList] = useState('');

  useEffect(() => {
    setClassList(
      cornerIdentifier == CornerIdEnum.CENTER
        ? clsx(styles.movableHeader)
        : clsx(
            styles.selectionBox,
            cornerIdentifier == CornerIdEnum.BOTTOM_LEFT ||
              cornerIdentifier == CornerIdEnum.BOTTOM_RIGHT
              ? styles.boxLower
              : styles.boxUpper,
            cornerIdentifier == CornerIdEnum.BOTTOM_LEFT ||
              cornerIdentifier == CornerIdEnum.TOP_LEFT
              ? styles.boxLeft
              : styles.boxRight
          )
    );
  }, []);

  // use animation with the destination being cursor position
  // todo: detach the grabbed box from website layout, it hinders it's free flow
  return (
    <Draggable
      onDrag={(event: any) => {
        propagationFunction(
          { x: event.movementX, y: event.movementY },
          cornerIdentifier
        );
      }}
      allowAnyClick={false}
      axis={'none'}>
      <div className={classList}>{children}</div>
    </Draggable>
  );
};

export default SelectionBox;
