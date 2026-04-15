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
  const label = value ? 'Supported' : 'Not supported';
  const symbol = value ? '✅' : '❌';

  return (
    <span role="img" aria-label={label}>
      {symbol}
    </span>
  );
}

export function CallTable({ bundleMode, noBundleMode }: CallTableProps) {
  const rows = [
    {
      label: 'Enabled',
      data: bundleMode,
      className: styles.bundleEnabled,
    },
    {
      label: 'Disabled',
      data: noBundleMode,
      className: styles.bundleDisabled,
    },
  ];

  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th scope="col">Bundle Mode</th>
            <th scope="col">RN Runtime</th>
            <th scope="col">UI Runtime</th>
            <th scope="col">Worker Runtime</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.label}>
              <th scope="row" className={row.className}>
                {row.label}
              </th>
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
