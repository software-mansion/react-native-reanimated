import HomepageButton from '../HomepageButton';
import styles from './styles.module.css';

const Links = [
  {
    title: 'React Native Reanimated',
    url: 'https://docs.swmansion.com/react-native-reanimated',
  },
  {
    title: 'React Native Gesture Handler',
    url: 'https://docs.swmansion.com/react-native-gesture-handler',
  },
  {
    title: 'React Native Screens',
    url: 'https://docs.swmansion.com/react-native-screens',
  },
  {
    title: 'React Native Live Markdown',
    url: 'https://github.com/Expensify/react-native-live-markdown',
  },
  {
    title: 'React Native SVG',
    url: 'https://github.com/react-native-svg/react-native-svg',
  },
  {
    title: 'React Native Audio API',
    url: 'https://github.com/react-native-audio/react-native-audio',
  },
  {
    title: 'React Native ExecuTorch',
    url: 'https://github.com/react-native-torch/react-native-torch',
  },
  {
    title: 'TypeGPU',
    url: 'https://github.com/react-native-typegpu/react-native-typegpu',
  },
  {
    title: 'Radon IDE',
    url: 'https://radon-ide.com',
  },
];

export default function HomepageFooter(): JSX.Element {
  return (
    <div className={styles.homepageFooter}>
      <div className={styles.contactUs}>
        <h2 className={styles.title}>
          We are <span className={styles.titleHighlight}>Software Mansion</span>
        </h2>
        <div className={styles.description}>
          We’re a software company built around improving developer experience
          and bringing to life the innovative ideas of our clients. Do you have
          a software project that we can help you with?
        </div>
        <HomepageButton
          title="Hire us"
          href="https://swmansion.com/contact/projects"
          className={styles.hireUsButton}
        />
      </div>
      <div className={styles.links}>
        {Links.map((link) => (
          <a
            key={link.title}
            className={styles.link}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer">
            {link.title}
          </a>
        ))}
      </div>
    </div>
  );
}
