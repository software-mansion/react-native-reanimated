import { colors, flex, radius, spacing } from '../../../theme';
import { CodeBlock, ConfigWithOverridesBlock, Text } from '../../../components';
import type { ListRenderItem } from 'react-native';
import { StyleSheet, View } from 'react-native';
import type { CSSTransitionConfig, StyleProps } from 'react-native-reanimated';
import type { ExampleItemProps } from '../screens/transitionSettings/components/ExamplesListCard';
import Animated from 'react-native-reanimated';
import { useCallback } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { iconSizes } from '../../../theme/icons';

type TransitionConfigurationProps = {
  sharedConfig: Partial<CSSTransitionConfig>;
  transitionStyles: StyleProps[];
  overrides?: ExampleItemProps[];
};

export default function TransitionConfiguration({
  sharedConfig,
  transitionStyles,
  overrides,
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
          icon={faArrowRight}
          color={colors.primary}
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
          data={transitionStyles}
          renderItem={renderItem}
          contentContainerStyle={styles.codeStylesList}
          ItemSeparatorComponent={renderSeparator}
          horizontal
        />
      </View>

      <View style={styles.section}>
        <Text variant="subHeading2">Transition settings</Text>
        <ConfigWithOverridesBlock
          sharedConfig={sharedConfig}
          overrides={overrides}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.xxs,
  },
  section: {
    gap: spacing.xs,
  },
  codeStylesList: {
    ...flex.center,
    paddingBottom: spacing.sm,
  },
  listSeparator: {
    ...flex.center,
    padding: spacing.xs,
  },
  codeBlock: {
    borderRadius: radius.sm,
    backgroundColor: colors.background2,
    padding: spacing.xs,
  },
});
