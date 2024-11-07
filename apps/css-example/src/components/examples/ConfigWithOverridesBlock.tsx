import { StyleSheet, View } from 'react-native';

import { CodeBlock } from '@/components/misc';
import { colors, radius, spacing } from '@/theme';
import type { AnyRecord } from '@/types';
import { getCodeWithOverrides, typedMemo } from '@/utils';

type ConfigWithOverridesBlockProps<C, O> = {
  sharedConfig: C;
  overrides?: Array<O>;
};

function ConfigWithOverridesBlock<C extends AnyRecord, O extends AnyRecord>({
  overrides,
  sharedConfig,
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
    borderRadius: radius.sm,
    padding: spacing.xs,
  },
});

export default typedMemo(ConfigWithOverridesBlock);
