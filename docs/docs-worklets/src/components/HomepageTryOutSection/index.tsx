import HomepageButton from '../HomepageButton';
import styles from './styles.module.css';

export default function HomepageTryOutSection(): JSX.Element {
  return (
    <div className={styles.tryOutSection}>
      <h2 className={styles.title}>
        <div>
          Ready to try out{' '}
          <span className={styles.titleHighlight}>Worklets</span>?
        </div>
      </h2>
      <HomepageButton title="Get started" href="/react-native-worklets/docs/" />
    </div>
  );
}
