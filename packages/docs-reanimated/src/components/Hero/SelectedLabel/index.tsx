import clsx from 'clsx';
import React, { useEffect, useRef } from 'react';
import styles from './styles.module.css';
import SelectionBox, { DraggableId } from './SelectionBox';
import {
  DynamicStyles,
  StaticStyles,
  TextScaleStyles,
  computeSelectionStyles,
  computeTextStyles,
} from './utils';

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

  const movementPropagator = (
    movementDelta: { x: number; y: number },
    draggableIdentifier: DraggableId
  ) => {
    if (!isInteractive) return;

    applyDynamicStyles(
      computeSelectionStyles(
        movementDelta,
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
    </span>
  );
};

export default SelectedLabel;
