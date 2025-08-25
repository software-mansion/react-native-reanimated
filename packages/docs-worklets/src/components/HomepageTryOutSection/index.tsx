import HomepageButton from '../HomepageButton';
import styles from './styles.module.css';

export default function HomepageTryOutSection(): JSX.Element {
  return (
    <div className={styles.tryOutSection}>
      <div className={styles.title}>
        <div>
          Ready to try out{' '}
          <span className={styles.titleHighlight}>Worklets</span>?
        </div>
      </div>
      <HomepageButton title="Get started" href="/react-native-worklets/docs/" />
    </div>
  );
}
