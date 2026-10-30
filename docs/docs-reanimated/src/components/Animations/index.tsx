import React, { useCallback, useEffect, useRef, useState } from 'react';
import styles from './styles.module.css';

import AnimationsBackground from '@site/src/components/Animations/AnimationsBackground';
import AnimationsSection, {
  Section,
} from '@site/src/components/Animations/AnimationsSection';
import Phone from '@site/src/components/Animations/Phone';
import {
  KeyboardDemo,
  SensorDemo,
} from '@site/src/components/Animations/demos';
import SpringBasicExample from '../ReanimatedExamples/SpringBasicExample';
import DecayBasicExample from '../ReanimatedExamples/DecayBasicExample';
import FadeTileExample from '../ReanimatedExamples/FadeTileExample';

const sections: Section[] = [
  {
    id: 'animations',
    title: 'Animations',
    body: 'Animate every React Native prop on iOS, Android and the Web up to 120 fps.',
    code: `function App() {
  const width = useSharedValue(100);
  const handlePress = () => {
    // highlight-next-line
    width.value = withSpring(width.value + 50);
  };
  return <Animated.View style={{ ...styles.box, width }} />
}`,
    render: () => <SpringBasicExample initialOffset={56} />,
    docsLink:
      'https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/your-first-animation',
  },
  {
    id: 'gestures',
    title: 'Gestures',
    body: 'Gesture smoothly thanks to Reanimated’s integration with React Native Gesture Handler.',
    code: `import { Gesture, GestureDetector } from "react-native-gesture-handler";

function App() {
  // highlight-next-line
  const pan = Gesture.Pan();

  return (
    <GestureDetector gesture={pan}>
      <Animated.View />
    </GestureDetector>
  );
}`,
    render: () => (
      <div className={styles.gestureInset}>
        <DecayBasicExample />
      </div>
    ),
    hint: 'Grab and fling the square',
    docsLink:
      'https://docs.swmansion.com/react-native-reanimated/docs/fundamentals/handling-gestures',
  },
  {
    id: 'layout-animations',
    title: 'Layout animations',
    body: 'Animate views when they are added and removed from the view hierarchy. Just like that.',
    code: `function App() {
  // highlight-next-line
  return <Animated.View entering={FadeIn} exiting={FadeOut} />;
}`,
    render: () => <FadeTileExample isMobile />,
    hint: 'Add a few, then tap × to remove',
    docsLink:
      'https://docs.swmansion.com/react-native-reanimated/docs/layout-animations/entering-exiting-animations',
  },
  {
    id: 'sensor-animations',
    title: 'Sensor-based animations',
    body: 'Connect your animations to a gyroscope or accelerometer with just one hook. It’s that easy.',
    code: `// highlight-next-line
const gyroscope = useAnimatedSensor(SensorType.GYROSCOPE);

useDerivedValue(() => {
  const { x, y, z } = gyroscope.sensor.value;
});`,
    render: () => <SensorDemo />,
    motion: 'tilt',
    docsLink:
      'https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedSensor',
  },
  {
    id: 'keyboard-animations',
    title: 'Keyboard-based animations',
    body: 'Create animations based on the device keyboard state and position.',
    code: `function App() {
  // highlight-next-line
  const keyboard = useAnimatedKeyboard();
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -keyboard.height.value }],
  }));
  //...
}`,
    render: () => <KeyboardDemo />,
    docsLink:
      'https://docs.swmansion.com/react-native-reanimated/docs/device/useAnimatedKeyboard',
  },
];

const DESKTOP_QUERY = '(min-width: 1024px)';

// null until mounted, so neither layout's phone renders during SSR.
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState<boolean | null>(null);

  useEffect(() => {
    const query = window.matchMedia(DESKTOP_QUERY);
    const update = () => setIsDesktop(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  return isDesktop;
}

const Animations = () => {
  const [activeSection, setActiveSection] = useState(0);
  const chapterRefs = useRef<(HTMLLIElement | null)[]>([]);
  const isDesktop = useIsDesktop();

  useEffect(() => {
    // A chapter becomes active when it crosses the middle band of the viewport.
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(
              Number((entry.target as HTMLElement).dataset.index)
            );
          }
        });
      },
      { rootMargin: '-45% 0px -45% 0px' }
    );
    chapterRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const scrollToSection = useCallback((idx: number) => {
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    chapterRefs.current[idx]?.scrollIntoView({
      behavior: reduceMotion ? 'auto' : 'smooth',
      block: 'center',
    });
  }, []);

  const active = sections[activeSection];

  return (
    <AnimationsBackground>
      <div className={styles.showcase}>
        {isDesktop && (
          <div className={styles.stage}>
            <div className={styles.stageSticky}>
              <Phone
                title={active.title}
                hint={active.hint}
                motion={active.motion}
                screenKey={active.id}
                render={active.render}
                pager={{
                  labels: sections.map((section) => section.title),
                  active: activeSection,
                  onSelect: scrollToSection,
                }}
              />
            </div>
          </div>
        )}
        <ol className={styles.chapters}>
          {sections.map((section, idx) => (
            <AnimationsSection
              key={section.id}
              ref={(el) => {
                chapterRefs.current[idx] = el;
              }}
              section={section}
              index={idx}
              active={idx === activeSection}
              withPhone={isDesktop === false}
            />
          ))}
        </ol>
      </div>
    </AnimationsBackground>
  );
};

export default Animations;
