import styles from './styles.module.css';

export default function HomepageAboutSection(): JSX.Element {
  return (
    <div className={styles.aboutSection}>
      <h2>What this is all about?</h2>
      <h1>
        React Native Worklets boost your software’s performance, allowing you to
        run multiple processes concurrently, without any delays, and using pure
        JavaScript.
      </h1>
      {/* <div className={styles.videoPlaceholder} /> */}
    </div>
  );
}
