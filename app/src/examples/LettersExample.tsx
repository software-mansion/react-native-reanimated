import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeOut, Layout } from 'react-native-reanimated';

function splitLetters(text: string) {
  const map = new Map();
  return text.split('').map((char) => {
    const nth = map.get(char) || 0;
    map.set(char, nth + 1);
    return { char, key: `${char}${nth}` };
  });
}

interface LettersProps {
  text: string;
}

function Letters({ text }: LettersProps) {
  return (
    <Animated.View style={styles.line}>
      {splitLetters(text).map(({ char, key }, index) => (
        <Animated.Text
          key={key}
          style={styles.text}
          entering={FadeIn.duration(500).delay(index)}
          exiting={FadeOut.duration(500).delay(index)}
          layout={Layout.duration(Math.random() * 700 + 200).delay(index)}>
          {char}
        </Animated.Text>
      ))}
    </Animated.View>
  );
}

const LOREM_IPSUM_1 =
  'Lorem ipsum dolor sit amet, consectetur adipiscing elit. Pellentesque vel consequat urna, facilisis tincidunt massa. Fusce viverra leo non mi lacinia dictum. Sed cursus feugiat dui, quis malesuada sapien auctor vitae. Nulla ut erat ac leo posuere suscipit. Vivamus eleifend placerat elit, ut efficitur ligula semper nec. Aenean dictum volutpat sapien eget sollicitudin. Praesent non ultricies mauris, sit amet gravida ante. Morbi iaculis elit quis libero pretium dapibus. Vivamus ullamcorper leo id dapibus tempus. Aenean malesuada eleifend justo, at eleifend lectus varius ac. Donec et nibh dignissim, mollis est tincidunt, dignissim justo. Sed laoreet tempor mi, sit amet fringilla tellus varius nec. Pellentesque ut mi orci. Donec in ultrices metus.';

const LOREM_IPSUM_2 =
  'Suspendisse eleifend et orci in vestibulum. In ut porttitor tortor. Vivamus dignissim mollis metus, sit amet scelerisque nunc porta quis. Mauris velit arcu, feugiat ac libero vel, commodo laoreet neque. In eu odio non nunc luctus lobortis. Duis scelerisque nec velit sit amet pretium. Quisque ac odio ac leo auctor dapibus at et justo. Sed est metus, commodo vitae elit at, porta interdum quam. Aenean porta nunc risus, vitae viverra massa pretium vitae. Donec feugiat placerat lectus, ac laoreet ligula. Vivamus scelerisque rhoncus nisi eu aliquet. Nunc quis aliquam nulla, et convallis mauris. Sed egestas nunc facilisis, tempor leo ut, lacinia quam. Donec tincidunt nulla eu velit aliquam posuere. Duis vestibulum placerat sodales. Quisque dignissim.';

export default function LettersExample() {
  const [state, setState] = React.useState(true);

  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => !s);
    }, 2000);
    return () => clearInterval(id);
  }, []);

  return (
    <View style={styles.container}>
      <Letters text={state ? LOREM_IPSUM_1 : LOREM_IPSUM_2} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  line: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    maxWidth: 325,
  },
  text: {
    fontFamily: Platform.OS === 'ios' ? 'Palatino' : 'serif',
    fontWeight: '500',
    fontSize: 23,
  },
});
