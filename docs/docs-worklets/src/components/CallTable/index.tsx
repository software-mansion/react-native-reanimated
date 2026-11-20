import Link from '@docusaurus/Link';

import styles from './styles.module.css';

interface CallTableData {
  rnRuntime: boolean;
  uiRuntime: boolean;
  workerRuntime: boolean;
}

interface CallTableProps {
  calls?: CallTableData;
  bundleMode?: CallTableData;
  noBundleMode?: CallTableData;
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

function renderHint() {
  return (
    <p className={styles.hint}>
      <Link to="/docs/guides/call-tables">What does it mean?</Link>
    </p>
  );
}

export function CallTable({ calls, bundleMode, noBundleMode }: CallTableProps) {
  if (calls) {
    return (
      <div className={styles.container}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th scope="col">RN Runtime</th>
              <th scope="col">UI Runtime</th>
              <th scope="col">Worker Runtime</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{renderCellValue(calls.rnRuntime)}</td>
              <td>{renderCellValue(calls.uiRuntime)}</td>
              <td>{renderCellValue(calls.workerRuntime)}</td>
            </tr>
          </tbody>
        </table>
        {renderHint()}
      </div>
    );
  }

  if (!bundleMode || !noBundleMode) {
    return null;
  }

  const rows = [
    {
      label: 'Bundle Mode',
      data: bundleMode,
      className: styles.bundleEnabled,
    },
    {
      label: 'Legacy Eval Mode',
      data: noBundleMode,
      className: styles.bundleDisabled,
    },
  ];

  return (
    <div className={styles.container}>
      <table className={`${styles.table} ${styles.modeTable}`}>
        <thead>
          <tr>
            <th scope="col">Mode</th>
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
      {renderHint()}
    </div>
  );
}

export default CallTable;
