import styles from './styles.module.css';

import ArrowRight from '@site/static/img/arrow-right.svg';

const items = [
  {
    text: 'An all-in-one IDE for Expo & React Native.',
    button: 'Try Radon IDE for free',
  },
  {
    text: 'Streamline your React Native & Expo development.',
    button: 'Install Radon IDE',
  },
  {
    text: 'Set breakpoints and debug React Native apps with ease.',
    button: 'Try Radon IDE for free',
  },
  {
    text: 'Catch runtime errors right in your editor.',
    button: 'Install Radon IDE',
  },
  {
    text: 'Preview React Native components in isolation',
    button: 'Try Radon IDE',
  },
  {
    text: 'Run, preview, and debug your React Native & Expo apps without leaving VSCode.',
    button: 'Try Radon IDE for free',
  },
  {
    text: 'Run, preview, and debug apps faster.',
    button: 'Try our IDE for React Native',
  },
  {
    text: 'Reduce context switching & debug faster.',
    button: 'Try Radon IDE for free',
  },
  {
    text: 'Reduce context switching & preview components instantly.',
    button: 'Try Radon IDE for free',
  },
  {
    text: 'Reduce context switching & streamline React Native and Expo development.',
    button: 'Install Radon IDE',
  },
];

export default function RadonBanner() {
  const item = items[Math.floor(Math.random() * items.length)];

  return (
    <a
      href="https://ide.swmansion.com/?utm_source=reanimated"
      className={styles.container}>
      <div className={styles.content}>
        <p className={styles.text}>{item.text}</p>
        <span className={styles.button}>
          {item.button} <ArrowRight />
        </span>
      </div>
      <span className={styles.ellipseLeft} />
      <span className={styles.ellipseRight} />
    </a>
  );
}
