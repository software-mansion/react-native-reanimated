import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {
  findFirstCategoryLink,
  useDocById,
} from '@docusaurus/theme-common/internal';
import ThemedImage from '@theme/ThemedImage';
import { translate } from '@docusaurus/Translate';
import styles from './styles.module.css';
import useBaseUrl from '@docusaurus/useBaseUrl';

function CardContainer({ href, children }) {
  return (
    <Link
      href={href}
      className={clsx('card padding--lg', styles.cardContainer)}>
      {children}
    </Link>
  );
}
function CardLayout({ href, title, description }) {
  const cardIcons = {
    light: useBaseUrl('/img/card-icon.svg'),
    dark: useBaseUrl('/img/card-icon-dark.svg'),
  };

  return (
    <CardContainer href={href}>
      <div className={styles.cardIconWrapper}>
        <ThemedImage sources={cardIcons} className={styles.cardIcon} />
      </div>
      <div className={styles.cardLabels}>
        <h2 className={clsx('text--truncate', styles.cardTitle)} title={title}>
          {title}
        </h2>
        {description && (
          <p
            className={clsx('text--truncate', styles.cardDescription)}
            title={description}>
            {description}
          </p>
        )}
      </div>
    </CardContainer>
  );
}
function CardCategory({ item }) {
  const href = findFirstCategoryLink(item);
  // Unexpected: categories that don't have a link have been filtered upfront
  if (!href) {
    return null;
  }
  return (
    <CardLayout
      href={href}
      title={item.label}
      description={
        item.description ??
        translate(
          {
            message: '{count} items',
            id: 'theme.docs.DocCard.categoryDescription',
            description:
              'The default description for a category card in the generated index about how many items this category includes',
          },
          { count: item.items.length }
        )
      }
    />
  );
}
function CardLink({ item }) {
  const doc = useDocById(item.docId ?? undefined);
  return (
    <CardLayout
      href={item.href}
      title={item.label}
      description={item.description ?? doc?.description}
    />
  );
}
export default function DocCard({ item }) {
  switch (item.type) {
    case 'link':
      return <CardLink item={item} />;
    case 'category':
      return <CardCategory item={item} />;
    default:
      throw new Error(`unknown item type ${JSON.stringify(item)}`);
  }
}
