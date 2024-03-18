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
  const selectionRef = useRef(null);
  const selectionContainerRef = useRef(null);
  const textLabelRef = useRef(null);

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
    enabledTextInteractivity: false,
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
      enabledTextInteractivity: true,
    };

    applyDynamicStyles({
      top: 0,
      left: 0,
      width: rect.width,
      height: rect.height,
    });
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

  const classList = clsx(
    isInteractive ? styles.preEnabledTextInteractivity : null,
    staticStyles.current.enabledTextInteractivity
      ? styles.interactiveHeaderText
      : styles.headerText
  );

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
          <span ref={textLabelRef} className={classList}>
            {children}
          </span>
        </SelectionBox>
      </div>
    </span>
  );
};

export default SelectedLabel;
