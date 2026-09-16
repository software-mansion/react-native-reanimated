import { render } from '@testing-library/react';
import { StyleSheet, View } from 'react-native';

import Animated from '../src';

const AnimatedView = Animated.createAnimatedComponent(View);

describe('pseudo selector values in the host style on web', () => {
  it('renders the default as the resting value', () => {
    const { getByTestId } = render(
      <AnimatedView
        style={{
          backgroundColor: {
            default: 'rgb(0, 0, 255)',
            ':hover': 'rgb(255, 0, 0)',
          },
        }}
        testID="subject"
      />
    );

    expect(getByTestId('subject').style.backgroundColor).toBe('rgb(0, 0, 255)');
  });

  it('drops the value of an earlier inline entry when there is no default', () => {
    const { getByTestId } = render(
      <AnimatedView
        style={[
          { backgroundColor: 'rgb(0, 0, 255)', width: 100 },
          { backgroundColor: { ':hover': 'rgb(255, 0, 0)' } },
        ]}
        testID="subject"
      />
    );

    const subject = getByTestId('subject');
    expect(subject.style.backgroundColor).toBe('');
    expect(subject.style.width).toBe('100px');
  });

  it('drops the value of an earlier StyleSheet entry when there is no default', () => {
    const styles = StyleSheet.create({
      box: { backgroundColor: 'rgb(0, 0, 255)', width: 100 },
    });
    const { getByTestId } = render(
      <>
        <AnimatedView style={styles.box} testID="plain" />
        <AnimatedView
          style={[
            styles.box,
            { backgroundColor: { ':hover': 'rgb(255, 0, 0)' } },
          ]}
          testID="subject"
        />
      </>
    );

    const plain = getByTestId('plain');
    const subject = getByTestId('subject');
    expect(plain.style.backgroundColor).toBe('rgb(0, 0, 255)');
    expect(subject.style.backgroundColor).toBe('');
    expect(subject.style.width).toBe('100px');
    expect(subject.className).toBe(plain.className);
  });
});
