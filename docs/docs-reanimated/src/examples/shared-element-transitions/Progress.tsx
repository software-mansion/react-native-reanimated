import React, { useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { useAnimatedReaction, withSpring } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import { Slider } from '@mui/material';

import {
  CodeLine,
  DemoLayout,
  Panel,
  PanelNote,
  PanelRow,
  Segmented,
} from './kit/controls';
import {
  Box,
  CHANNELS,
  FlightLayer,
  ProgressStyle,
  allChannels,
  lerp,
  spring,
  timing,
  useFlight,
} from './kit/flight';
import { Phone, SCREEN_WIDTH, STATUS_BAR_HEIGHT } from './kit/Phone';
import { PLACES, Place, Scenery } from './kit/Scenery';
import {
  HEADER_BOTTOM,
  NavHeader,
  StackScreens,
  useScreenStack,
} from './kit/Stack';
import { useDemoTheme } from './kit/theme';

type Mode = 'linear' | 'custom';

const MODE_OPTIONS = [
  { value: 'linear', label: 'Default' },
  { value: 'custom', label: 'Custom: round in the middle' },
] as const;

const CODE: Record<Mode, string> = {
  linear:
    '// Every changed property moves\n// in a straight line with the swipe.\nSharedTransition',
  custom: `SharedTransition.progressAnimation((values, progress) => {
  'worklet';
  const mix = (from: number, to: number) =>
    from + (to - from) * progress;
  return {
    originX: mix(values.currentOriginX, values.targetOriginX),
    originY: mix(values.currentOriginY, values.targetOriginY),
    width: mix(values.currentWidth, values.targetWidth),
    height: mix(values.currentHeight, values.targetHeight),
    borderRadius: 24 + Math.sin(Math.PI * progress) * 80,
  };
})`,
};

const bulgingCorners: ProgressStyle = (pair, progress) => {
  'worklet';
  const radius = lerp(
    pair.from.borderRadius ?? 0,
    pair.to.borderRadius ?? 0,
    progress
  );
  return { borderRadius: radius + Math.sin(Math.PI * progress) * 80 };
};

const ITEMS = PLACES.slice(0, 4);
const ROW_TOP = STATUS_BAR_HEIGHT + 56;
const ROW_PITCH = 64;
const THUMB = 48;
const RELEASE = spring(350, 1);

function thumbBox(index: number, place: Place): Box {
  return {
    x: 14,
    y: ROW_TOP + index * ROW_PITCH,
    width: THUMB,
    height: THUMB,
    borderRadius: 24,
    backgroundColor: place.sky,
  };
}

function photoBox(place: Place): Box {
  return {
    x: 14,
    y: HEADER_BOTTOM + 8,
    width: SCREEN_WIDTH - 28,
    height: SCREEN_WIDTH - 28,
    borderRadius: 24,
    backgroundColor: place.sky,
  };
}

export default function Progress({ width }: { width?: number }) {
  const theme = useDemoTheme();
  const [mode, setMode] = useState<Mode>('custom');
  const [selected, setSelected] = useState(0);
  const [progress, setProgress] = useState(0);
  const [outcome, setOutcome] = useState<'finished' | 'cancelled' | null>(null);
  const [swipeDriven, setSwipeDriven] = useState(false);
  const swiping = useRef(false);
  const stack = useScreenStack(1, 'second');
  const flight = useFlight();
  const place = ITEMS[selected];
  const busy = flight.pairs.length > 0;
  const onDetails = stack.top === 'second';

  useAnimatedReaction(
    () => flight.channels.x.value,
    (value) => {
      if (busy && swipeDriven) {
        scheduleOnRN(setProgress, Math.min(1, Math.max(0, value)));
      }
    },
    [busy, swipeDriven]
  );

  const beginSwipe = () => {
    if (swiping.current || !onDetails) {
      return;
    }
    swiping.current = true;
    setSwipeDriven(true);
    setOutcome(null);
    flight.begin([
      {
        tag: place.id,
        from: photoBox(place),
        to: thumbBox(selected, place),
        content: <Scenery place={place} />,
      },
    ]);
  };

  const scrub = (value: number) => {
    beginSwipe();
    if (!swiping.current) {
      return;
    }
    setProgress(value);
    stack.progress.value = 1 - value;
    CHANNELS.forEach((channel) => {
      flight.channels[channel].value = value;
    });
  };

  const release = (value: number) => {
    if (!swiping.current) {
      return;
    }
    swiping.current = false;
    const finish = value >= 0.5;
    stack.progress.value = withSpring(finish ? 0 : 1, {
      duration: 350,
      dampingRatio: 1,
    });
    flight.release(finish ? 1 : 0, allChannels(RELEASE), (landed) => {
      stack.settle(landed ? 'first' : 'second');
      setOutcome(landed ? 'finished' : 'cancelled');
      setProgress(0);
    });
  };

  const back = () => {
    if (busy) {
      return;
    }
    setSwipeDriven(false);
    setOutcome(null);
    flight.start({
      pairs: [
        {
          tag: place.id,
          from: photoBox(place),
          to: thumbBox(selected, place),
          content: <Scenery place={place} />,
        },
      ],
      animations: allChannels(timing()),
    });
    stack.pop();
  };

  const open = (index: number) => {
    setSelected(index);
    setProgress(0);
    setSwipeDriven(false);
    setOutcome(null);
    flight.start({
      pairs: [
        {
          tag: ITEMS[index].id,
          from: thumbBox(index, ITEMS[index]),
          to: photoBox(ITEMS[index]),
          content: <Scenery place={ITEMS[index]} />,
        },
      ],
      animations: allChannels(timing()),
    });
    stack.push();
  };

  const pan = Gesture.Pan()
    .activeOffsetX(8)
    .failOffsetY([-12, 12])
    .onStart(() => {
      scheduleOnRN(beginSwipe);
    })
    .onUpdate((event) => {
      scheduleOnRN(
        scrub,
        Math.min(1, Math.max(0, event.translationX / SCREEN_WIDTH))
      );
    })
    .onEnd((event) => {
      scheduleOnRN(
        release,
        Math.min(1, Math.max(0, event.translationX / SCREEN_WIDTH))
      );
    });

  const hidden = (tag: string) => ({ opacity: flight.isFlying(tag) ? 0 : 1 });

  const list = (
    <View style={styles.fill}>
      <Text style={[styles.title, { color: theme.text }]}>Albums</Text>
      {ITEMS.map((item, index) => {
        const box = thumbBox(index, item);
        return (
          <Pressable
            key={item.id}
            disabled={busy}
            onPress={() => open(index)}
            style={[styles.row, { top: box.y }]}>
            <View
              style={[
                styles.thumb,
                { backgroundColor: item.sky },
                hidden(item.id),
              ]}>
              <Scenery place={item} />
            </View>
            <View style={styles.rowText}>
              <Text style={[styles.rowTitle, { color: theme.text }]}>
                {item.name}
              </Text>
              <Text style={[styles.rowSubtitle, { color: theme.subtle }]}>
                {item.country}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const box = photoBox(place);
  const details = (
    <GestureDetector gesture={pan}>
      <View style={styles.fill}>
        <NavHeader title={place.name} onBack={back} />
        <View
          style={[
            styles.photo,
            {
              left: box.x,
              top: box.y,
              width: box.width,
              height: box.height,
              backgroundColor: place.sky,
            },
            hidden(place.id),
          ]}>
          <Scenery place={place} />
        </View>
        <Text
          style={[
            styles.swipeHint,
            { top: box.y + box.height + 18, color: theme.subtle },
          ]}>
          Drag this screen to the right →
        </Text>
      </View>
    </GestureDetector>
  );

  const phone = (
    <Phone>
      <StackScreens stack={stack} first={list} second={details} />
      <FlightLayer
        flight={flight}
        progressStyle={
          swipeDriven && mode === 'custom' ? bulgingCorners : undefined
        }
      />
    </Phone>
  );

  const swipeProgress = busy && swipeDriven ? progress : 0;
  const progressHint =
    onDetails || busy ? swipeProgress.toFixed(2) : 'open a photo first';
  const outcomeText =
    outcome === 'finished'
      ? 'Released past the middle: the transition finished.'
      : outcome === 'cancelled'
        ? 'Released before the middle: the photo went back.'
        : 'Release before 0.5 to cancel, after 0.5 to finish.';
  const swipeSlider = (
    <Slider
      size="small"
      min={0}
      max={1}
      step={0.01}
      value={swipeProgress}
      disabled={!onDetails || (busy && !swiping.current)}
      onChange={(_, value) => scrub(value as number)}
      onChangeCommitted={(_, value) => release(value as number)}
      marks={[{ value: 0.5 }]}
      sx={sliderStyling}
    />
  );

  return (
    <GestureHandlerRootView>
      <DemoLayout
        width={width}
        phone={phone}
        footer={<CodeLine>{CODE[mode]}</CodeLine>}>
        <Panel>
          <PanelRow title="Back swipe" hint={progressHint}>
            {swipeSlider}
            <PanelNote>{outcomeText}</PanelNote>
          </PanelRow>
          <PanelRow title="During the back swipe">
            <Segmented
              fullWidth
              value={mode}
              options={MODE_OPTIONS}
              onChange={setMode}
            />
          </PanelRow>
        </Panel>
      </DemoLayout>
    </GestureHandlerRootView>
  );
}

const sliderStyling = {
  color: 'var(--swm-interactive-slider)',
  '& .MuiSlider-rail': {
    color: 'var(--swm-interactive-slider-rail)',
    opacity: 1,
  },
  '& .MuiSlider-mark': {
    height: 10,
    width: 2,
  },
  '& .MuiSlider-thumb, & .MuiSlider-track': {
    transition: 'none',
  },
};

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  title: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 12,
    left: 14,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  row: {
    position: 'absolute',
    left: 14,
    right: 14,
    height: THUMB,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 24,
    overflow: 'hidden',
  },
  rowText: {
    gap: 2,
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  rowSubtitle: {
    fontSize: 11,
  },
  photo: {
    position: 'absolute',
    borderRadius: 24,
    overflow: 'hidden',
  },
  swipeHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontSize: 11,
  },
});
