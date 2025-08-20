import HomepageButton, { ButtonStyling } from '../HomepageButton';
import styles from './styles.module.css';

export default function HomepageMainSection(): JSX.Element {
  return (
    <div className={styles.headerSection}>
      <div className={styles.header}>
        <h1>
          React Native <span className={styles.headerHighlight}>Worklets</span>
        </h1>
      </div>
      <h2>
        Powerful multithreading engine. For your React Native apps and
        libraries. No native code required.
      </h2>

      <div className={styles.buttons}>
        <HomepageButton
          title="Get started"
          href="/react-native-worklets/docs/"
        />
        <HomepageButton
          hideArrow
          title="See examples"
          href="/react-native-worklets/docs/"
          backgroundStyling={ButtonStyling.TO_BLUE}
        />
      </div>
    </div>
  );
}
