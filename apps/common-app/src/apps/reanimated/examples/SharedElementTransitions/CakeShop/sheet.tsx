import type {
  BottomSheetBackdropProps,
  BottomSheetProps,
} from '@gorhom/bottom-sheet';
import type BottomSheet from '@gorhom/bottom-sheet';
import { BottomSheetBackdrop } from '@gorhom/bottom-sheet';
import React, { useRef, useState } from 'react';
import { StyleSheet } from 'react-native';

import { colors } from './theme';

// The sheet moves with a transform, which a shared transition does not follow.
// So the shared views fly in after the sheet stops, and fly back when it starts to close.
export function useSheetBoundary() {
  const ref = useRef<BottomSheet>(null);
  const [isActive, setIsActive] = useState(false);
  const [hasLanded, setHasLanded] = useState(false);

  const open = () => ref.current?.snapToIndex(0);
  const close = () => ref.current?.close();

  const sheetProps: Partial<BottomSheetProps> = {
    onChange: (index) => {
      setHasLanded(index === 0);
      setIsActive(index === 0);
    },
    onAnimate: (_, toIndex) => {
      if (toIndex === -1) {
        setIsActive(false);
      }
    },
  };

  return { ref, isActive, hasLanded, open, close, sheetProps };
}

export function SheetBackdrop(props: BottomSheetBackdropProps) {
  return (
    <BottomSheetBackdrop
      {...props}
      appearsOnIndex={0}
      disappearsOnIndex={-1}
      opacity={0.35}
      style={[props.style, styles.backdrop]}
    />
  );
}

export const sheetStyles = StyleSheet.create({
  background: {
    borderRadius: 40,
    backgroundColor: colors.cream,
  },
  handle: {
    width: 44,
    backgroundColor: colors.navySoft,
  },
});

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: colors.navy,
  },
});
