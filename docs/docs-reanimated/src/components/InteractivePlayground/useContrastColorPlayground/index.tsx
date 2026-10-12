import React, { Dispatch, MutableRefObject, useRef, useState } from 'react';
import Example from './Example';
import ColorPicker from '../ColorPicker';
import rowStyles from '../exampleWithColorPicker.module.css';

const initialState = {
  /* --swm-blue-light-100 */
  color: '#38ACDD',
};

interface ExampleWithPickerProps {
  color: string;
  setColor: Dispatch<string>;
  refreshKey: number;
  prevRefreshKey: MutableRefObject<number>;
}

function ExampleWithPicker({
  color,
  setColor,
  refreshKey,
  prevRefreshKey,
}: ExampleWithPickerProps) {
  return (
    <div className={rowStyles.example}>
      <Example color={color} />
      <ColorPicker
        color={color}
        setColor={setColor}
        defaultValue={initialState.color}
        prevKeyRef={prevRefreshKey}
        refreshKey={refreshKey}
      />
    </div>
  );
}

export default function useContrastColorPlayground() {
  const [key, setKey] = useState(0);
  const prevRefreshKey = useRef(key);

  const [color, setColor] = useState(initialState.color);

  const resetOptions = () => {
    setKey((prevState) => prevState + 1);
  };

  // prettier-ignore
  const code = `
    // color = '${color.toUpperCase()}'
    const backgroundColor = useSharedValue(color);

    useEffect(() => {
      backgroundColor.value = withTiming(color);
    }, [color]);

    const boxStyle = useAnimatedStyle(() => ({
      backgroundColor: backgroundColor.value,
    }));

    const textStyle = useAnimatedStyle(() => ({
      color: contrastColor(backgroundColor.value),
    }));
  `;

  return {
    example: ExampleWithPicker,
    props: { color, setColor, refreshKey: key, prevRefreshKey },
    code,
    resetOptions,
  };
}
