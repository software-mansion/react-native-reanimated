import React, { useRef } from 'react';
import styles from './styles.module.css';
import { useDraggable, useDndMonitor } from '@dnd-kit/core';
import { bezierEasingValues } from '@site/src/components/InteractivePlayground/PlaygroundChart';

interface Point {
  x: number;
  y: number;
}
interface PlaygroundChartPointProps {
  label: string;
  bounds: Point;
  pointMoveHandler?: (point: Point) => void;
  pointControls: Point;
}

const PlaygroundChartPoint: React.FC<PlaygroundChartPointProps> = ({
  label,
  bounds,
  pointMoveHandler,
  pointControls,
}) => {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: label });
  const dragOrigin = useRef<Point | null>(null);

  useDndMonitor({
    onDragStart({ active }) {
      if (active.id === label) {
        dragOrigin.current = { x: pointControls.x, y: pointControls.y };
      }
    },
    onDragMove({ active, delta }) {
      if (active.id === label && dragOrigin.current && pointMoveHandler) {
        pointMoveHandler({
          x: Math.min(
            Math.max(dragOrigin.current.x + delta.x, 0),
            bounds.x - bezierEasingValues.handleSize
          ),
          y: Math.min(
            Math.max(dragOrigin.current.y + delta.y, 0),
            bounds.y - bezierEasingValues.handleSize
          ),
        });
      }
    },
    onDragEnd({ active }) {
      if (active.id === label) {
        dragOrigin.current = null;
      }
    },
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      style={{
        position: 'absolute',
        left: pointControls.x,
        top: pointControls.y,
      }}>
      <button className={styles.handle}>{label}</button>
    </div>
  );
};

export default PlaygroundChartPoint;
