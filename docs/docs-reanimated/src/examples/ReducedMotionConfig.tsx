import React, { useEffect, useState } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  ReducedMotionConfig,
  ReduceMotion,
} from 'react-native-reanimated';
import { FormControl, MenuItem, Select } from '@mui/material';
import useThemedTextStyle from '@site/src/hooks/useThemedTextStyle';

const MODES = [
  { label: 'System', value: ReduceMotion.System },
  { label: 'Always', value: ReduceMotion.Always },
  { label: 'Never', value: ReduceMotion.Never },
];

const SelectStyling = {
  fontSize: 14,
  color: 'text.secondary',
  backgroundColor: 'background.default',
  borderRadius: 0,
  '& fieldset': {
    borderColor: 'text.secondary',
  },
};

export default function App() {
  const textColor = useThemedTextStyle();
  const [mode, setMode] = useState(ReduceMotion.System);
  const sv = useSharedValue<number>(0);
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${sv.value}deg` }],
  }));

  useEffect(() => {
    sv.value = 0;
    sv.value = withRepeat(withTiming(360, { duration: 2000 }), -1, true);
  }, [textColor, mode]);

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <Text style={[styles.text, textColor]}>Mode</Text>
        <FormControl sx={{ minWidth: 85 }} size="small">
          <Select
            value={mode}
            sx={SelectStyling}
            onChange={(e) => setMode(e.target.value as ReduceMotion)}>
            {MODES.map((option) => (
              <MenuItem
                key={option.value}
                value={option.value}
                sx={{ color: 'text.secondary' }}>
                {option.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </View>
      <ReducedMotionConfig mode={mode} />
      <Animated.View style={[styles.box, animatedStyle]} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    height: 100,
    width: 100,
    backgroundColor: '#b58df1',
    borderRadius: 20,
  },
  container: {
    flex: 1,
    alignItems: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  text: {
    marginRight: 10,
    fontFamily: 'Aeonik',
    fontSize: 16,
  },
});
