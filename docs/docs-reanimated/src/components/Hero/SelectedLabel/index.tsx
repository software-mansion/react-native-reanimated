import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import styles from './styles.module.css';
import SelectionBox, { DraggableId } from './SelectionBox';
import {
  DynamicStyles,
  SelectionBounds,
  StaticStyles,
  TextScaleStyles,
  clampMovementDelta,
  computeSelectionStyles,
  computeTextStyles,
} from './utils';
import { DndContext } from '@dnd-kit/core';

const SelectedLabel: React.FC<{
  children: React.ReactNode;
  isInteractive: boolean;
}> = ({ children, isInteractive = false }) => {
  // DOM refs
  const selectionRef = useRef<HTMLSpanElement | null>(null);
  const selectionContainerRef = useRef<HTMLDivElement | null>(null);
  const textLabelRef = useRef<HTMLSpanElement | null>(null);

  // Render-persistent label positioning styles
  const dynamicStyles = useRef<DynamicStyles>({
    top: 0,
    left: 0,
    width: null,
    height: null,
  });

  const staticStyles = useRef<StaticStyles>({
    initialWidth: null,
    initialHeight: null,
  });

  const applyDynamicStyles = (newDynamicStyles: DynamicStyles) => {
    const currentDynamicStyles = dynamicStyles.current;

    // save changes
    currentDynamicStyles.top = newDynamicStyles.top;
    currentDynamicStyles.left = newDynamicStyles.left;
    currentDynamicStyles.width = newDynamicStyles.width;
    currentDynamicStyles.height = newDynamicStyles.height;

    // apply changes to refs
    selectionRef.current.style.transform = `translate(${currentDynamicStyles.left}px, ${currentDynamicStyles.top}px)`;
    selectionContainerRef.current.style.width = `${currentDynamicStyles.width}px`;
    selectionContainerRef.current.style.height = `${currentDynamicStyles.height}px`;
  };

  const applyTextScale = (scaleObject: TextScaleStyles) => {
    textLabelRef.current.style.transform = `translate(-50%, -50%) scale(${scaleObject.x}, ${scaleObject.y})`;
  };

  useEffect(() => {
    if (!isInteractive) return;

    let rect = selectionContainerRef.current.getBoundingClientRect();
    staticStyles.current = {
      initialWidth: rect.width,
      initialHeight: rect.height,
    };

    applyDynamicStyles({
      top: 0,
      left: 0,
      width: rect.width,
      height: rect.height,
    });

    textLabelRef.current.className = clsx(styles.interactiveHeaderText);
  }, [isInteractive]);

  const getSelectionBounds = (): SelectionBounds => {
    const container = selectionContainerRef.current;
    const entries = [container, ...container.querySelectorAll('*')].map(
      (element) => ({ element, rect: element.getBoundingClientRect() })
    );
    const frameEntries = entries.filter(
      (entry) => entry.element !== textLabelRef.current
    );

    return {
      left: Math.min(...entries.map((entry) => entry.rect.left)),
      top: Math.min(...frameEntries.map((entry) => entry.rect.top)),
      right: Math.max(...entries.map((entry) => entry.rect.right)),
      bottom: Math.max(...frameEntries.map((entry) => entry.rect.bottom)),
    };
  };

  const movementPropagator = (
    movementDelta: { x: number; y: number },
    draggableIdentifier: DraggableId
  ) => {
    if (!isInteractive) return;

    const clampedDelta = clampMovementDelta(
      movementDelta,
      draggableIdentifier,
      getSelectionBounds(),
      {
        width: document.documentElement.clientWidth,
        height: document.documentElement.clientHeight,
      }
    );

    applyDynamicStyles(
      computeSelectionStyles(
        clampedDelta,
        draggableIdentifier,
        dynamicStyles.current
      )
    );
    applyTextScale(
      computeTextStyles(dynamicStyles.current, staticStyles.current)
    );
  };

  return (
    <span ref={selectionRef} className={styles.selection}>
      <DndContext autoScroll={false}>
        <div ref={selectionContainerRef} className={styles.selectionContainer}>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.TOP_LEFT}
            isInteractive={isInteractive}></SelectionBox>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.TOP_RIGHT}
            isInteractive={isInteractive}></SelectionBox>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.BOTTOM_LEFT}
            isInteractive={isInteractive}></SelectionBox>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.BOTTOM_RIGHT}
            isInteractive={isInteractive}></SelectionBox>
          <SelectionBox
            propagationFunction={movementPropagator}
            draggableIdentifier={DraggableId.CENTER}
            isInteractive={isInteractive}>
            <span ref={textLabelRef} className={styles.headerText}>
              {children}
            </span>
          </SelectionBox>
        </div>
      </DndContext>
    </span>
  );
};

export default SelectedLabel;
