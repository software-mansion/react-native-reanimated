import styles from './styles.module.css';

export default function HomepageAboutSection(): JSX.Element {
  return (
    <div className={styles.aboutSection}>
      <h2>What is this all about?</h2>
      <h3>
        React Native Worklets boost your software’s performance, allowing you to
        run multiple processes concurrently, without any delays, and using pure
        JavaScript.
      </h3>
      <div className={styles.videoContainer}>
        <iframe
          allowFullScreen
          src="https://drive.google.com/file/d/1Js57i7_mnN41mqbIRU3NX3DIHGtcUMEU/preview"
        />
      </div>
    </div>
  );
}
