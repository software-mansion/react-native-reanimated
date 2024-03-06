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

  // use animation with the destination being cursor position
  // todo: detach the grabbed box from website layout, it hinders it's free flow
  return (
    <Draggable
      onDrag={(e, position) => {
        propagationFunction(position, cornerIdentifier);
      }}
      allowAnyClick={false}
      axis={'none'}>
      <div style={{ position: 'absolute' }} className={cssSelector}></div>
    </Draggable>
  );
};

export default SelectionBox;
