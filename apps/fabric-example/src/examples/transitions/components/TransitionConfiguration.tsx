import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { useCallback } from 'react';
import type { ListRenderItem } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { CSSTransitionConfig, StyleProps } from 'react-native-reanimated';
import Animated from 'react-native-reanimated';

import { CodeBlock, ConfigWithOverridesBlock, Text } from '@/components';
import type { ExampleItemProps } from '@/examples/transitions/screens/transitionSettings/components/ExamplesListCard';
import { colors, flex, radius, spacing } from '@/theme';
import { iconSizes } from '@/theme/icons';

type TransitionConfigurationProps = {
  sharedConfig: Partial<CSSTransitionConfig>;
  transitionStyles: Array<StyleProps>;
  overrides?: Array<ExampleItemProps>;
};

export default function TransitionConfiguration({
  overrides,
  sharedConfig,
  transitionStyles,
}: TransitionConfigurationProps) {
  const renderItem = useCallback<ListRenderItem<StyleProps>>(
    ({ item }) => (
      <View style={styles.codeBlock}>
        <CodeBlock code={JSON.stringify(item, null, 2)} />
      </View>
    ),
    []
  );

  const renderSeparator = useCallback(
    () => (
      <View style={styles.listSeparator}>
        <FontAwesomeIcon
          color={colors.primary}
          icon={faArrowRight}
          size={iconSizes.md}
        />
      </View>
    ),
    []
  );

  return (
    <View style={styles.container}>
      <View style={styles.section}>
        <Text variant="subHeading2">Transition styles</Text>
        <Animated.FlatList
          contentContainerStyle={styles.codeStylesList}
          data={transitionStyles}
          ItemSeparatorComponent={renderSeparator}
          renderItem={renderItem}
          horizontal
        />
      </View>

      <View style={styles.section}>
        <Text variant="subHeading2">Transition settings</Text>
        <ConfigWithOverridesBlock
          overrides={overrides}
          sharedConfig={sharedConfig}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  codeBlock: {
    backgroundColor: colors.background2,
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
  codeStylesList: {
    ...flex.center,
    paddingBottom: spacing.sm,
  },
  container: {
    gap: spacing.xxs,
  },
  listSeparator: {
    ...flex.center,
    padding: spacing.xs,
  },
  section: {
    gap: spacing.xs,
  },
});
