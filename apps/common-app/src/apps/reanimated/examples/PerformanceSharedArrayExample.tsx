import {
  SharedValue,
  useSharedValue,
  useDerivedValue,
  PerformanceMonitor,
} from 'react-native-reanimated';
import { Canvas, Fill, Text, useFont } from '@shopify/react-native-skia';
import { useCallback, useEffect } from 'react';
import { Button, SafeAreaView, View } from 'react-native';

const ARRAY_LENGTH = 15_000;
const INTERVAL_MS = 10;

type UseSkiaGenerateHighLoad = {
  bigArray: SharedValue<number[]>;
  modify: () => void;
};

const useReanimatedGenerateHighLoad = (): UseSkiaGenerateHighLoad => {
  const bigArray = useSharedValue<number[]>([]);

  const modify = useCallback(() => {
    // runOnUI(() => {
    bigArray.value = Array.from({ length: ARRAY_LENGTH }, Math.random);
    // })();
  }, [bigArray]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      modify();
    }, INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [modify]);

  return { bigArray, modify };
};

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const elementsNeeded = [...Array(20)];

export default function PerformanceSharedArrayExample() {
  const { bigArray, modify } = useReanimatedGenerateHighLoad();

  return (
    <View style={{ flex: 1 }}>
      <PerformanceMonitor></PerformanceMonitor>
      <Button title="Modify" onPress={modify} />
      <SafeAreaView style={{ flex: 1 }}>
        <Canvas style={{ flex: 1, padding: 20 }}>
          <Fill color="white" />
          {elementsNeeded.map((_, index) => (
            <TextItem key={index} index={index} bigArray={bigArray} />
          ))}
        </Canvas>
      </SafeAreaView>
    </View>
  );
}

const TextItem = ({
  index,
  bigArray,
}: {
  index: number;
  bigArray: SharedValue<number[]>;
}) => {
  const text = useDerivedValue(() => {
    return bigArray.value?.[index]?.toString() || '-';
  });
  const font = useFont(
    require('../../../../../web-example/assets/fonts/Poppins/Poppins-Bold.ttf'),
    20
  );

  return (
    <Text key={index} x={0} y={(index + 1) * 20} font={font} text={text} />
  );
};
