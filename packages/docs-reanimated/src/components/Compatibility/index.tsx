import React from 'react';

import nightlyCompatibility from '../../../../react-native-reanimated/compatibility.json';
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

export function ReanimatedCompatibility() {
  const reactNativeVersions = [
    '0.70',
    '0.71',
    '0.72',
    '0.73',
    '0.74',
    '0.75',
    '0.76',
    '0.77',
    '0.78',
    '0.79',
    '0.80',
    '0.81',
  ];

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

  const compatibilityData: CompatibilityItem[] = [
    {
      version: 'nightly',
      compatibility: createCompatibility(
        nightlyCompatibility['react-native-versions']
      ),
    },
    {
      version: '4.0.0 – 4.0.1',
      isSpacer: true,
      compatibility: createCompatibility(['0.78', '0.79', '0.80', '0.81']),
    },
    {
      version: '3.19.0',
      compatibility: createCompatibility(['0.78', '0.79', '0.80', '0.81']),
    },
    {
      version: '3.18.0',
      compatibility: createCompatibility([
        '0.75',
        '0.76',
        '0.77',
        '0.78',
        '0.79',
        '0.80',
      ]),
    },
    {
      version: '3.17.4 – 3.17.5',
      compatibility: createCompatibility([
        '0.75',
        '0.76',
        '0.77',
        '0.78',
        '0.79',
      ]),
    },
    {
      version: '3.17.1 – 3.17.3',
      compatibility: createCompatibility(['0.75', '0.76', '0.77', '0.78']),
    },
    {
      version: '3.17.0',
      compatibility: createCompatibility(['0.75', '0.76', '0.77']),
    },
    {
      version: '3.16.7',
      compatibility: createCompatibility(['0.74', '0.75', '0.76', '0.77']),
    },
    {
      version: '3.16.0 – 3.16.6',
      compatibility: createCompatibility(['0.74', '0.75', '0.76']),
    },
    {
      version: '3.15.x',
      compatibility: createCompatibility(['0.74', '0.75']),
    },
    {
      version: '3.9.x – 3.14.x',
      compatibility: createCompatibility(['0.74']),
    },
    {
      version: '3.6.x – 3.8.x',
      compatibility: createCompatibility(['0.72', '0.73']),
    },
    {
      version: '3.1.x – 3.5.x',
      compatibility: createCompatibility(['0.72']),
    },
    {
      version: '3.0.x',
      compatibility: createCompatibility(['0.71']),
    },
  ];

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
          {compatibilityData.map((item, index) => (
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
