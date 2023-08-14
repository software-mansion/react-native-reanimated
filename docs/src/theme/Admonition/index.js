import React from 'react';
import clsx from 'clsx';
import { ThemeClassNames, useColorMode } from '@docusaurus/theme-common';
import Translate from '@docusaurus/Translate';
import styles from './styles.module.css';

import Danger from '/static/img/danger.svg';
import DangerDark from '/static/img/danger-dark.svg';

const AdmonitionConfigs = {
  note: {
    infimaClassName: 'secondary',
    label: (
      <Translate
        id="theme.admonition.note"
        description="The default label used for the Note admonition (:::note)">
        note
      </Translate>
    ),
  },
  tip: {
    infimaClassName: 'success',
    label: (
      <Translate
        id="theme.admonition.tip"
        description="The default label used for the Tip admonition (:::tip)">
        tip
      </Translate>
    ),
  },
  danger: {
    infimaClassName: 'danger',
    label: (
      <Translate
        id="theme.admonition.danger"
        description="The default label used for the Danger admonition (:::danger)">
        danger
      </Translate>
    ),
  },
  info: {
    infimaClassName: 'info',
    label: (
      <Translate
        id="theme.admonition.info"
        description="The default label used for the Info admonition (:::info)">
        info
      </Translate>
    ),
  },
  caution: {
    infimaClassName: 'caution',
    label: (
      <Translate
        id="theme.admonition.caution"
        description="The default label used for the Caution admonition (:::caution)">
        caution
      </Translate>
    ),
  },
};
// Legacy aliases, undocumented but kept for retro-compatibility
const aliases = {
  secondary: 'note',
  important: 'info',
  success: 'tip',
  warning: 'danger',
};

export default function Admonition(props) {
  const { colorMode } = useColorMode();
  const {
    children,
    type,
    title,
    icon: iconProp,
  } = processAdmonitionProps(props);
  const typeConfig = getAdmonitionConfig(type);
  const titleLabel = title ?? typeConfig.label;

  return (
    <div
      className={clsx(
        ThemeClassNames.common.admonition,
        ThemeClassNames.common.admonitionType(props.type),
        styles.admonition,
        'alert',
        styles[`alert--${typeConfig.infimaClassName}`]
      )}>
      <div className={styles.admonitionHeading}>
        <div className={styles.admonitionIcon}>
          {colorMode === 'light' ? <Danger /> : <DangerDark />}
        </div>

        {titleLabel}
      </div>
      <div className={styles.admonitionContent}>{children}</div>
    </div>
  );

  function getAdmonitionConfig(unsafeType) {
    const type = aliases[unsafeType] ?? unsafeType;
    const config = AdmonitionConfigs[type];
    if (config) {
      return config;
    }
    console.warn(
      `No admonition config found for admonition type "${type}". Using Info as fallback.`
    );
    return AdmonitionConfigs.info;
  }
}

// Workaround because it's difficult in MDX v1 to provide a MDX title as props
// See https://github.com/facebook/docusaurus/pull/7152#issuecomment-1145779682
function extractMDXAdmonitionTitle(children) {
  const items = React.Children.toArray(children);
  const mdxAdmonitionTitle = items.find(
    (item) =>
      React.isValidElement(item) && item.props?.mdxType === 'mdxAdmonitionTitle'
  );
  const rest = <>{items.filter((item) => item !== mdxAdmonitionTitle)}</>;
  return {
    mdxAdmonitionTitle,
    rest,
  };
}

function processAdmonitionProps(props) {
  const { mdxAdmonitionTitle, rest } = extractMDXAdmonitionTitle(
    props.children
  );
  return {
    ...props,
    title: props.title ?? mdxAdmonitionTitle,
    children: rest,
  };
}
