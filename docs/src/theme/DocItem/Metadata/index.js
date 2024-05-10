import React from 'react';
import { PageMetadata } from '@docusaurus/theme-common';
import { useDoc } from '@docusaurus/theme-common/internal';
import useBaseUrl from '@docusaurus/useBaseUrl';
export default function DocItemMetadata() {
  const { metadata, frontMatter, assets } = useDoc();

  if (!metadata.title) {
    return null;
  }

  const ogImageName = metadata.title
    .replace(/ /g, '-')
    .replace('/', '-')
    .toLowerCase();

  return (
    <PageMetadata
      title={metadata.title}
      description={metadata.description}
      keywords={frontMatter.keywords}
      image={`img/og/${
        ogImageName === '' || !ogImageName
          ? 'React Native Reanimated'
          : ogImageName
      }.png`}
    />
  );
}
