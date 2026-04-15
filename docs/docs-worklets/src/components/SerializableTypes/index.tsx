import React from 'react';

import styles from './styles.module.css';

export default function SupportedTypesTable() {
  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th style={{ textAlign: 'right' }}>Type</th>
          <th>Supported</th>
        </tr>
      </thead>
      <tbody>
        <TableRow type="string" isSupported={true} />
        <TableRow type="number" isSupported={true} />
        <TableRow type="boolean" isSupported={true} />
        <TableRow type="object" isSupported={true} />
        <TableRow type="array" isSupported={true} />
        <TableRow type="function (non-worklet)" isSupported={true} />
        <TableRow type="HostObject" isSupported={true} />
        <TableRow type="worklet" isSupported={true} />
        <TableRow type="Map" isSupported={true} />
        <TableRow type="Set" isSupported={true} />
        <TableRow type="ArrayBuffer" isSupported={true} />
        <TableRow type="RegExp" isSupported={true} />
        <TableRow type="Cyclic objects" isSupported={false} />
        <TableRow type="Objects with custom prototype" isSupported={false} />
      </tbody>
    </table>
  );
}

function TableRow({
  type,
  isSupported,
}: {
  type: string;
  isSupported: boolean;
}) {
  return (
    <tr>
      <td className={styles.type}>{type}</td>
      <td className={isSupported ? styles.supported : styles.unsupported}>
        {isSupported ? 'yes' : 'no'}
      </td>
    </tr>
  );
}
