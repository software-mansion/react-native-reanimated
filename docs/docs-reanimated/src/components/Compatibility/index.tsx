import { useDocsVersion } from '@docusaurus/plugin-content-docs/client';
import React from 'react';

import untypedCompatibilityData from '../../../../../packages/react-native-reanimated/compatibility.json';
import styles from './styles.module.css';

type Architecture = 'paper' | 'fabric';

interface PaperCompatibilityEntry {
  'react-native': string[];
}

interface FabricCompatibilityEntry {
  'react-native': string[];
  'react-native-worklets'?: string[];
}

type PaperCompatibilityData = Record<string, PaperCompatibilityEntry>;
type FabricCompatibilityData = Record<string, FabricCompatibilityEntry>;

type CompatibilityData = {
  paper: PaperCompatibilityData;
  fabric: FabricCompatibilityData;
};

const compatibilityData = untypedCompatibilityData as CompatibilityData;

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
  architecture?: Architecture;
};

export function ReanimatedCompatibility({
  spacerAfterIndex,
  architecture = 'fabric',
}: ReanimatedCompatibilityProps) {
  const docsVersion = useDocsVersion();

  const getCompatibilityEntriesForVersion = (version: string) => {
    const architectureData = compatibilityData[architecture];

    if (version === 'current') {
      // For current version, find the highest major version and include nightly
      const highestMajorVersion = Math.max(
        ...Object.keys(architectureData).map((key) => {
          const num = key.split('.')[0];
          return isNaN(+num) ? 0 : +num;
        })
      );

      return Object.entries(architectureData).filter(
        ([key]) =>
          key === 'nightly' || key.startsWith(`${highestMajorVersion}.`)
      );
    }

    // For versioned docs (e.g. "3.x", "2.x", "1.x"), extract the major version number
    const majorVersion = version.replace('.x', '');
    return Object.entries(architectureData).filter(([key]) =>
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

  const createCompatibility = (
    entry: PaperCompatibilityEntry | FabricCompatibilityEntry
  ) => {
    const compatibility: Record<string, boolean> = {};
    reactNativeVersions.forEach((version) => {
      compatibility[`rn${version.replace('.', '')}`] = isVersionSupported(
        entry['react-native'],
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
        compatibility: createCompatibility(data),
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
