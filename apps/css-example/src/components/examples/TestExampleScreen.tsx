import type { ReactNode } from 'react';
import React, { useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { Text } from '@/components/core';
import { Button, CopyButton } from '@/components/inputs';
import { ScrollScreen, Section } from '@/components/layout';
import type { LabelType } from '@/components/misc';
import { colors, flex, radius, spacing } from '@/theme';

type TestExampleScreenProps = {
  sections: Array<{
    webExampleLink?: string;
    title?: string;
    labelTypes?: Array<LabelType>;
    example: ReactNode;
    content: Array<{
      title: string;
      content: Array<string> | string;
    }>;
  }>;
};

export default function TestExampleScreen({
  sections,
}: TestExampleScreenProps) {
  const [key, setKey] = useState(0);

  return (
    <ScrollScreen>
      {sections.map(
        (
          { content, example, labelTypes, title: sectionTitle, webExampleLink },
          sectionIndex
        ) => (
          <Section
            key={sectionIndex}
            labelTypes={labelTypes}
            title={sectionTitle ?? ''}>
            <View style={styles.content}>
              {content.map(({ content: sectionText, title }, index) => (
                <View key={index} style={styles.contentSection}>
                  <Text variant="subHeading2">{title}</Text>
                  {Array.isArray(sectionText) ? (
                    sectionText.map((text) => <Text key={text}>{text}</Text>)
                  ) : (
                    <Text>{sectionText}</Text>
                  )}
                </View>
              ))}
            </View>

            {webExampleLink && (
              <View style={styles.linkRow}>
                <Text variant="subHeading2">**Web example** link:</Text>
                <CopyButton copyText={webExampleLink} title="CodePen" />
              </View>
            )}

            <Animated.View key={key} style={styles.container}>
              <Button
                size="small"
                style={styles.restartButton}
                title="Restart"
                onPress={() => setKey((prev) => prev + 1)}
              />
              {example}
            </Animated.View>
          </Section>
        )
      )}
    </ScrollScreen>
  );
}

const styles = StyleSheet.create({
  container: {
    ...flex.center,
    backgroundColor: colors.background2,
    borderRadius: radius.md,
    overflow: 'hidden',
    paddingBottom: spacing.lg,
    paddingTop: spacing.xxl,
  },
  content: {
    gap: spacing.sm,
  },
  contentSection: {
    gap: spacing.xs,
  },
  linkRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  restartButton: {
    position: 'absolute',
    right: spacing.xs,
    top: spacing.xs,
    zIndex: 1,
  },
});
