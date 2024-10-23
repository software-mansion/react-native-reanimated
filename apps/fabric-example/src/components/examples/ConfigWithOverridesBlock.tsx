import { StyleSheet, View } from 'react-native';
import type { AnyRecord } from '../../types';
import { colors, radius, spacing } from '../../theme';
import { getCodeWithOverrides, typedMemo } from '../../utils';
import { CodeBlock } from '../misc';

type ConfigWithOverridesBlockProps<C, O> = {
  sharedConfig: C;
  overrides?: O[];
};

function ConfigWithOverridesBlock<C extends AnyRecord, O extends AnyRecord>({
  sharedConfig,
  overrides,
}: ConfigWithOverridesBlockProps<C, O>) {
  const code = getCodeWithOverrides(sharedConfig, overrides, ['label']);

  return (
    <View style={styles.codeBlock}>
      <CodeBlock code={code} />
    </View>
  );
}

const styles = StyleSheet.create({
  codeBlock: {
    backgroundColor: colors.background2,
    padding: spacing.xs,
    borderRadius: radius.sm,
  },
});

export default typedMemo(ConfigWithOverridesBlock);
