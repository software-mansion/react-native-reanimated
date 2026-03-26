import Link from '@docusaurus/Link';

import styles from './styles.module.css';

interface CallTableRow {
  rnRuntime: boolean;
  uiRuntime: boolean;
  workerRuntime: boolean;
}

interface CallTableProps {
  bundleMode: CallTableRow;
  noBundleMode: CallTableRow;
}

function renderCellValue(value: boolean) {
  return value ? '✅' : '❌';
}

export function CallTable({ bundleMode, noBundleMode }: CallTableProps) {
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
        <Link to="/docs/guides/call-tables">What does it mean?</Link>
      </p>
    </div>
  );
}

export default CallTable;
