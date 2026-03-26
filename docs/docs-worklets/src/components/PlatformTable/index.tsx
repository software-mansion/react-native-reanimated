import styles from './styles.module.css';

interface PlatformTableProps {
  native: boolean;
  web: boolean;
}

export function PlatformTable({ native, web }: PlatformTableProps) {
  return (
    <div className={styles.container}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Native</th>
            <th>Web</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>{native ? '✅' : '❌'}</td>
            <td>{web ? '✅' : '❌'}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

export default PlatformTable;
