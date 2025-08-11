import React, { useCallback, useRef } from 'react';
import { StyleSheet, Text } from 'react-native';
import BottomSheet, { BottomSheetView } from '@gorhom/bottom-sheet';

export default function BottomSheetExample() {
  const bottomSheetRef = useRef<BottomSheet>(null);

  const handleSheetChanges = useCallback((index: number) => {
    console.log('handleSheetChanges', index);
  }, []);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      onChange={handleSheetChanges}
      snapPoints={['25%', '50%', '90%']}
      style={styles.bottomSheet}>
      <BottomSheetView style={styles.contentContainer}>
        <Text>Hello world!</Text>
      </BottomSheetView>
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  bottomSheet: {
    shadowRadius: 3,
    shadowOpacity: 0.1,
  },
  contentContainer: {
    flex: 1,
    paddingTop: 20,
    paddingBottom: 40,
    alignItems: 'center',
  },
});
