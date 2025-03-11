import type { PropsWithChildren } from 'react';
import { useMemo } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { spacing } from '@/theme';

import Stagger from '../misc/Stagger';

type GridProps = PropsWithChildren<{
  columns: number;
  columnGap?: number;
  rowGap?: number;
  gap?: number;
  squareCells?: boolean;
  style?: ViewStyle;
  staggerInterval?: number;
}>;

export default function Grid({
  children,
  columnGap,
  columns,
  gap,
  rowGap,
  squareCells,
  staggerInterval = -1,
  style,
}: GridProps) {
  const cGap = columnGap ?? gap ?? spacing.none;
  const rGap = rowGap ?? gap ?? spacing.none;

  const cellStyle = useMemo<ViewStyle>(
    () => ({
      ...styles.cell,
      alignItems: 'stretch',
      aspectRatio: squareCells ? 1 : undefined,
      flexBasis: `${100 / columns}%`,
      paddingHorizontal: cGap / 2,
      paddingVertical: rGap / 2,
    }),
    [columns, squareCells, cGap, rGap]
  );

  return (
    <Animated.View
      layout={LinearTransition}
      style={[
        styles.container,
        {
          marginHorizontal: -cGap / 2,
          marginVertical: -rGap / 2,
        },
        style,
      ]}>
      <Stagger interval={staggerInterval} wrapperStye={() => cellStyle}>
        {children}
      </Stagger>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
});
