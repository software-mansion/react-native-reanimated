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
    position: { x: number; y: number },
    cornerIdentifier: CornerIdEnum
  ) => void;
  cornerIdentifier: CornerIdEnum;
}> = ({ propagationFunction, cornerIdentifier }) => {
  const returnToOrigin = false;
  const [classList, setClassList] = useState('');

  useEffect(() => {
    console.log('running useEffect 1');
    setClassList(
      clsx(
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

  const [uploadPosition, setUploadPosition] = useState(false);

  const startMouseTracker = () => {
    console.log('starting mouse tracking');
    setUploadPosition(true);
  };

  const stopMouseTracker = () => {
    console.log('stopping mouse tracking');
    setUploadPosition(false);
  };

  useEffect(() => {
    const extractCoords = (event) => {
      return;
      // note for tommorrow: this is running only when it's supposed to as of latest.
      console.log(event.offsetX, event.offsetY);
      console.log(event);
      propagationFunction(
        {
          x: event.offsetX,
          y: event.offsetY,
        },
        cornerIdentifier
      );
    };

    if (uploadPosition) {
      window.addEventListener('mousemove', extractCoords);
    } else {
      window.removeEventListener('mousemove', extractCoords);
    }

    return () => {
      window.removeEventListener('mousemove', extractCoords);
    };
  }, [uploadPosition]);

  // use animation with the destination being cursor position
  // todo: detach the grabbed box from website layout, it hinders it's free flow
  return (
    <Draggable
      onStart={startMouseTracker}
      onStop={stopMouseTracker}
      onDrag={(event, dragEvent) => {
        propagationFunction(
          { x: dragEvent.deltaX, y: dragEvent.deltaY },
          cornerIdentifier
        );
      }}
      allowAnyClick={false}
      axis={'none'}>
      <div className={classList}></div>
    </Draggable>
  );
};

export default SelectionBox;
