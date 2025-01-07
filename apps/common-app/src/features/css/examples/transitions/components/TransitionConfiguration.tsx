import { faArrowRight } from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-native-fontawesome';
import { memo, useCallback } from 'react';
import type { ListRenderItem } from 'react-native';
import { FlatList, StyleSheet, View } from 'react-native';
import type {
  CSSTransitionProperties,
  StyleProps,
} from 'react-native-reanimated';
import Animated, { LinearTransition } from 'react-native-reanimated';

import { colors, flex, radius, spacing } from '@/theme';
import { iconSizes } from '@/theme/icons';
import { stringifyConfig } from '@/utils';
import { CodeBlock, ConfigWithOverridesBlock, Text } from '~/css/components';
import type { ExampleItemProps } from '~/css/examples/transitions/screens/transitionSettings/components/ExamplesListCard';

type TransitionConfigurationProps = {
  transitionProperties: Partial<CSSTransitionProperties>;
  transitionStyles: Array<StyleProps>;
  stylesTitle?: string;
  settingsTitle?: string;
  overrides?: Array<ExampleItemProps>;
};

function TransitionConfiguration({
  overrides,
  settingsTitle = 'Transition settings',
  stylesTitle = 'Transition styles',
  transitionProperties,
  transitionStyles,
}: TransitionConfigurationProps) {
  const renderItem = useCallback<ListRenderItem<StyleProps>>(
    ({ item }) => (
      <View style={styles.codeBlock}>
        <CodeBlock code={stringifyConfig(item)} />
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
    <Animated.View layout={LinearTransition} style={styles.container}>
      <View style={styles.section}>
        <Text variant="subHeading2">{stylesTitle}</Text>
        <FlatList
          contentContainerStyle={styles.codeStylesList}
          data={transitionStyles}
          ItemSeparatorComponent={renderSeparator}
          // TODO - remove once react-native-screens are updated to the
          // version where this issue is fixed
          // https://github.com/software-mansion/react-native-screens/issues/2339
          removeClippedSubviews={false}
          renderItem={renderItem}
          horizontal
        />
      </View>

      <Animated.View layout={LinearTransition} style={styles.section}>
        <Text variant="subHeading2">{settingsTitle}</Text>
        <ConfigWithOverridesBlock
          overrides={overrides}
          sharedConfig={transitionProperties}
        />
      </Animated.View>
    </Animated.View>
  );
}

export default memo(TransitionConfiguration);

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
    overflow: 'hidden',
  },
});
