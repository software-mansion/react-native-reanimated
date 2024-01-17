import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewProps,
} from 'react-native';
import Animated, {
  SharedValue,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import React from 'react';
import { Button } from '@mui/material';

type AccordionProps = ViewProps & {
  isExpanded: SharedValue<boolean>;
  viewKey: number | string;
  duration?: number;
};

const AccordionItem = ({
  isExpanded,
  children,
  viewKey,
  style,
  duration = 500,
}: AccordionProps) => {
  const height = useSharedValue(0);

  const derivedHeight = useDerivedValue(() =>
    withTiming(height.value * Number(isExpanded.value), {
      duration,
    })
  );
  const bodyStyle = useAnimatedStyle(() => ({
    height: derivedHeight.value,
  }));

  return (
    <Animated.View
      key={`accordionItem_${viewKey}`}
      style={[styles.animatedView, bodyStyle, style]}>
      <View
        onLayout={(e) => {
          height.value = e.nativeEvent.layout.height;
        }}
        style={styles.view}>
        {children}
      </View>
    </Animated.View>
  );
};

const Item = () => {
  return (
    <Image
      source={{
        uri: 'https://upload.wikimedia.org/wikipedia/commons/8/8c/Manul_close.jpg',
      }}
      style={styles.image}
    />
  );
};

type ParentProps = {
  open: SharedValue<boolean>;
};

const Parent = ({ open }: ParentProps) => {
  return (
    <View style={styles.parent}>
      <AccordionItem isExpanded={open} viewKey="Accordion">
        <Item />
      </AccordionItem>
    </View>
  );
};

const AccordionScreen = () => {
  const open = useSharedValue(false);
  const onPress = () => {
    open.value = !open.value;
  };

  return (
    <View style={styles.container}>
      <View style={styles.topPart}>
        <Button onClick={onPress} style={styles.button}>
          Click me
        </Button>
      </View>

      <View style={styles.bottomPart}>
        <Parent open={open} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingTop: 24,
  },
  topPart: {
    flex: 1,
  },
  bottomPart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    backgroundColor: '#6F2FE2',
    color: '#E9E8E7',
    textTransform: 'none',
    padding: 10,
    borderRadius: 24,
    alignSelf: 'center',
    marginBottom: 64,
  },
  counters: {
    justifyContent: 'center',
    padding: 24,
    flex: 1,
  },
  row: {
    flexDirection: 'row',
  },
  header: {
    textAlign: 'center',
    fontSize: 32,
  },
  image: {
    width: 200,
    height: 200,
  },
  parent: {
    width: 200,
  },
  view: {
    width: '100%',
    position: 'absolute',
  },
  animatedView: {
    width: '100%',
    overflow: 'hidden',
  },
});

export default AccordionScreen;
