import React from 'react';

import compatibilityData from '../../../../react-native-worklets/compatibility.json';
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
  isSpacer?: boolean;
  compatibility: Record<string, boolean>;
}

export function WorkletsCompatibility() {
  const reactNativeVersions = ['0.78', '0.79', '0.80', '0.81'];

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

  const compatibilityItems: CompatibilityItem[] = Object.entries(
    compatibilityData
  ).map(([version, data], index) => {
    return {
      version,
      isSpacer: index === 1,
      compatibility: createCompatibility(data['react-native']),
    };
  });

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
