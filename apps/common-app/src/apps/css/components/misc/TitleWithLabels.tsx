import { StyleSheet, View } from 'react-native';

import { spacing } from '@/theme';
import type { FontVariant } from '@/types';

import { Text } from '../core';
import type { LabelType } from './Label';
import Label from './Label';

type TitleWithLabelsProps = {
  variant: FontVariant;
  title?: string;
  labelTypes?: Array<LabelType>;
};

export default function TitleWithLabels({
  labelTypes,
  title,
}: TitleWithLabelsProps) {
  return (
    <View style={styles.titleWithLabels}>
      {title && <Text variant="subHeading2">{title}</Text>}
      {labelTypes?.map((labelType, index) => (
        <Label key={index} type={labelType} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  titleWithLabels: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
});
