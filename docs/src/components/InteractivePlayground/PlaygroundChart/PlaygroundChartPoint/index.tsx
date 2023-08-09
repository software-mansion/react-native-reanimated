import React, { useEffect, useState } from 'react';
import styles from './styles.module.css';
import Draggable, { DraggableEvent } from 'react-draggable';

import { bezierEasingValues } from '@site/src/components/InteractivePlayground/PlaygroundChart';

interface Point {
  x: number;
  y: number;
}

const PlaygroundChartPoint: React.FC<{
  label: string;
  startingPoint: Point;
  bounds: Point;
  pointMoveHandler?: (point: Point) => void;
  pointControls?: Point;
}> = ({ label, startingPoint, bounds, pointMoveHandler, pointControls }) => {
  const [place, setPlace] = useState<{
    x: number;
    y: number;
  }>({
    x: startingPoint.x,
    y: startingPoint.y,
  });

  const handlePointDrag = (e: DraggableEvent, position) => {
    const { x, y } = position;

    setPlace({ x, y });
    pointMoveHandler({ x, y });
  };

  useEffect(() => {
    setPlace({
      x: pointControls.x,
      y: pointControls.y,
    });
  }, [pointControls.x, pointControls.y]);

  return (
    <>
      <Draggable
        position={place}
        onDrag={handlePointDrag}
        bounds={{
          top: 0,
          left: 0,

          // Limit bound to the borders
          right: bounds.x - bezierEasingValues.handleSize,
          bottom: bounds.y - bezierEasingValues.handleSize,
        }}>
        <button className={styles.handle}>{label}</button>
      </Draggable>
    </>
  );
};

export default PlaygroundChartPoint;
