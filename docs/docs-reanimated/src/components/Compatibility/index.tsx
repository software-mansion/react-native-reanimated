import { useDocsVersion } from '@docusaurus/plugin-content-docs/client';
import React from 'react';

import compatibilityData from '../../../../../packages/react-native-reanimated/compatibility.json';
import styles from './styles.module.css';

export function Yes() {
  return <div className={styles.supported}>yes</div>;
}

export function No() {
  return <div className={styles.notSupported}>no</div>;
}

interface VersionProps {
  version: string;
}

export function Version({ version }: VersionProps) {
  return <div className={styles.version}>{version}</div>;
}

export function Spacer() {
  return <div className={styles.spacer}></div>;
}

interface CompatibilityItem {
  version: string;
  isSpacer: boolean;
  compatibility: Record<string, boolean>;
}

type ReanimatedCompatibilityProps = {
  spacerAfterIndex?: number;
};

export function ReanimatedCompatibility({
  spacerAfterIndex,
}: ReanimatedCompatibilityProps) {
  const docsVersion = useDocsVersion();

  const getCompatibilityEntriesForVersion = (version: string) => {
    if (version === 'current') {
      // For current version, find the highest major version and include nightly
      const highestMajorVersion = Math.max(
        ...Object.keys(compatibilityData).map((key) => {
          const num = key.split('.')[0];
          return isNaN(+num) ? 0 : +num;
        })
      );

      return Object.entries(compatibilityData).filter(
        ([key]) =>
          key === 'nightly' || key.startsWith(`${highestMajorVersion}.`)
      );
    }

    // For versioned docs (e.g. "3.x", "2.x", "1.x"), extract the major version number
    const majorVersion = version.replace('.x', '');
    return Object.entries(compatibilityData).filter(([key]) =>
      key.startsWith(`${majorVersion}.`)
    );
  };

  const filteredCompatibilityData = getCompatibilityEntriesForVersion(
    docsVersion.version
  );

  const reactNativeVersions = Array.from(
    new Set(
      filteredCompatibilityData.flatMap(([, data]) => data['react-native'])
    )
  ).sort();

  const isVersionSupported = (supportedVersions: string[], version: string) =>
    supportedVersions.includes(version);

  const createCompatibility = (supportedVersions: string[]) => {
    const compatibility: Record<string, boolean> = {};
    reactNativeVersions.forEach((version) => {
      compatibility[`rn${version.replace('.', '')}`] = isVersionSupported(
        supportedVersions,
        version
      );
    });
    return compatibility;
  };

  const compatibilityItems: CompatibilityItem[] = filteredCompatibilityData.map(
    ([version, data], index) => {
      return {
        version,
        isSpacer: index === spacerAfterIndex,
        compatibility: createCompatibility(data['react-native']),
      };
    }
  );

  return (
    <div className="compatibility">
      <table className={styles.table}>
        <thead>
          <tr>
            <th></th>
            {reactNativeVersions.map((version) => (
              <th key={version}>{version}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {compatibilityItems.map((item, index) => (
            <React.Fragment key={index}>
              <tr>
                <td>
                  <Version version={item.version} />
                </td>
                {reactNativeVersions.map((version) => {
                  const key = `rn${version.replace('.', '')}`;
                  return (
                    <td key={version}>
                      {item.compatibility[key] ? <Yes /> : <No />}
                    </td>
                  );
                })}
              </tr>
              {item.isSpacer && <Spacer />}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}
