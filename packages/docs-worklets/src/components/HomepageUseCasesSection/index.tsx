import GestureHandlerVideo from '@site/static/recordings/gest.mp4';
import LiveMarkdownVideo from '@site/static/recordings/markdown.mp4';
import ReanimatedVideo from '@site/static/recordings/rea.mp4';
import SkiaVideo from '@site/static/recordings/skia.mp4';

import styles from './styles.module.css';
import UseCase from './UseCase';

const useCases = [
  {
    title: 'React Native Reanimated',
    url: 'https://docs.swmansion.com/react-native-reanimated',
    description:
      'Core library, used by almost 90% of React Native developers. It uses Worklets to make sure that animations run smoothly, even when business logic is especially heavy.',
    mp4: ReanimatedVideo,
  },
  {
    title: 'React Native Gesture Handler',
    url: 'https://docs.swmansion.com/react-native-gesture-handler',
    description:
      'Popular library for handling gestures in React Native. Thanks to Worklets, it uses a separate runtime on the main thread, and takes care of gestures without delays.',
    mp4: GestureHandlerVideo,
  },
  {
    title: 'React Native Skia',
    url: 'https://shopify.github.io/react-native-skia/docs/getting-started/installation',
    description:
      'Library that lets you draw 2D graphics in React Native. It separates drawing processes from the main business logic using Worklets, enabling better performance.',
    mp4: SkiaVideo,
  },
  {
    title: 'React Native Live Markdown',
    url: 'https://github.com/Expensify/react-native-live-markdown',
    description:
      'Cross-platform markdown editor. Thanks to Worklets, it formats the text on the UI runtime, giving you the same experience as the native rich-text-formatter.',
    mp4: LiveMarkdownVideo,
  },
];

export default function HomepageUseCasesSection(): JSX.Element {
  return (
    <>
      <div className={styles.useCasesSection}>
        <h2 id="who-else-is-using-worklets">Who else is using Worklets?</h2>
        <div className={styles.description}>
          React Native Worklets can help you power up your apps, but they also
          serve as the foundation for other popular libraries. Here are some of
          our favorites.
        </div>
        <div className={styles.useCasesGrid}>
          {useCases.map((useCase) => (
            <UseCase key={useCase.title} {...useCase} />
          ))}
        </div>
      </div>
    </>
  );
}
