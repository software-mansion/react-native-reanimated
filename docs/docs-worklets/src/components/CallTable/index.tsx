import type { ReactElement } from 'react';

import styles from './styles.module.css';

export function Yes() {
  return <div className={styles.supported}>yes</div>;
}

export function No() {
  return <div className={styles.notSupported}>no</div>;
}

type CellValue = boolean | string | number | ReactElement | null;

interface CallTableRow {
  rnRuntime: CellValue;
  uiRuntime: CellValue;
  workerRuntime: CellValue;
}

interface CallTableProps {
  bundleMode: CallTableRow;
  noBundleMode: CallTableRow;
  fnName: string;
}

function renderCellValue(value: CellValue) {
  if (typeof value === 'boolean') {
    return value ? <Yes /> : <No />;
  }

  return value;
}

export function CallTable({
  bundleMode,
  noBundleMode,
  fnName: title,
}: CallTableProps) {
  const rows = [
    {
      label: 'Bundle mode enabled',
      data: bundleMode,
      className: styles.bundleEnabled,
    },
    {
      label: 'Bundle mode disabled',
      data: noBundleMode,
      className: styles.bundleDisabled,
    },
  ];

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th></th>
            <th>RN Runtime</th>
            <th>UI Runtime</th>
            <th>Worker Runtime</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <td className={row.className}>{row.label}</td>
              <td>{renderCellValue(row.data.rnRuntime)}</td>
              <td>{renderCellValue(row.data.uiRuntime)}</td>
              <td>{renderCellValue(row.data.workerRuntime)}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className={styles.hint}>
        <a href="/react-native-worklets/docs/guides/call-tables">
          What does it mean?
        </a>{' '}
      </p>
    </div>
  );
}

export default CallTable;
