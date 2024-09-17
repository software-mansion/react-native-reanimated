import { Children, useMemo } from 'react';
import type { PropsWithChildren, ReactNode } from 'react';
import type { ViewStyle } from 'react-native';
import { StyleSheet } from 'react-native';
import { spacing } from '../../theme';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { Stagger } from '../misc';

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
  columns,
  children,
  columnGap,
  rowGap,
  gap,
  squareCells,
  style,
  staggerInterval = -1,
}: GridProps) {
  const cGap = columnGap ?? gap ?? spacing.none;
  const rGap = rowGap ?? gap ?? spacing.none;

  const cellStyle = useMemo<ViewStyle>(
    () => ({
      ...styles.cell,
      flexBasis: `${100 / columns}%`,
      aspectRatio: squareCells ? 1 : undefined,
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
      <Stagger wrapperStye={() => cellStyle} interval={staggerInterval}>
        {children}
      </Stagger>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  cell: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
