import styles from './styles.module.css';

export default function DeprecatedBanner() {
  return (
    <div className={styles.container}>
      <span className={styles.text}>
        ⚠️ This information is deprecated and will be removed in the next major
        release.
      </span>
    </div>
  );
}
