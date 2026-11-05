import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Caption, DemoLayout, Segmented } from './kit/controls';
import { Box, FlightLayer, allChannels, timing, useFlight } from './kit/flight';
import { Phone, SCREEN_WIDTH, STATUS_BAR_HEIGHT } from './kit/Phone';
import { PLACES, Place, Scenery } from './kit/Scenery';
import {
  HEADER_BOTTOM,
  NavHeader,
  StackScreens,
  useScreenStack,
} from './kit/Stack';
import { DemoTheme, useDemoTheme } from './kit/theme';

type TagMode = 'same' | 'different' | 'none';

const TAG_MODES = [
  { value: 'same', label: 'Same tag' },
  { value: 'different', label: 'Other tag' },
  { value: 'none', label: 'No tag' },
] as const;

const ITEMS = PLACES.slice(0, 3);
const ROW_TOP = STATUS_BAR_HEIGHT + 56;
const ROW_PITCH = 70;
const THUMB = 52;

function thumbBox(index: number, place: Place): Box {
  return {
    x: 14,
    y: ROW_TOP + index * ROW_PITCH,
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    backgroundColor: place.sky,
  };
}

function photoBox(place: Place): Box {
  return {
    x: 14,
    y: HEADER_BOTTOM + 10,
    width: SCREEN_WIDTH - 28,
    height: 150,
    borderRadius: 20,
    backgroundColor: place.sky,
  };
}

function detailsTag(mode: TagMode, place: Place) {
  if (mode === 'same') {
    return place.id;
  }
  return mode === 'different' ? 'photo' : undefined;
}

export default function TagDemo({ width }: { width?: number }) {
  const theme = useDemoTheme();
  const [mode, setMode] = useState<TagMode>('same');
  const [selected, setSelected] = useState(0);
  const stack = useScreenStack();
  const flight = useFlight();
  const place = ITEMS[selected];
  const targetTag = detailsTag(mode, place);
  const matches = targetTag === place.id;
  const busy = flight.pairs.length > 0;

  const navigate = (from: Box, to: Box, flyingPlace: Place) => {
    if (detailsTag(mode, flyingPlace) === flyingPlace.id) {
      flight.start({
        pairs: [
          {
            tag: flyingPlace.id,
            from,
            to,
            content: <Scenery place={flyingPlace} />,
          },
        ],
        animations: allChannels(timing()),
      });
    }
  };

  const open = (index: number) => {
    setSelected(index);
    navigate(
      thumbBox(index, ITEMS[index]),
      photoBox(ITEMS[index]),
      ITEMS[index]
    );
    stack.push();
  };

  const back = () => {
    navigate(photoBox(place), thumbBox(selected, place), place);
    stack.pop();
  };

  const hidden = (tag: string) => ({ opacity: flight.isFlying(tag) ? 0 : 1 });

  const list = (
    <View style={styles.fill}>
      <Text style={[styles.title, { color: theme.text }]}>Photos</Text>
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
              <TagChip theme={theme} tag={item.id} state="neutral" />
            </View>
          </Pressable>
        );
      })}
    </View>
  );

  const box = photoBox(place);
  const details = (
    <View style={styles.fill}>
      <NavHeader title={place.name} onBack={busy ? () => {} : back} />
      <View
        style={[
          styles.photo,
          { left: box.x, top: box.y, width: box.width, height: box.height },
          { backgroundColor: place.sky },
          hidden(place.id),
        ]}>
        <Scenery place={place} />
      </View>
      <View style={[styles.detailsChip, { top: box.y + box.height + 10 }]}>
        <TagChip
          theme={theme}
          tag={targetTag}
          state={matches ? 'match' : 'mismatch'}
        />
      </View>
      <View style={[styles.body, { top: box.y + box.height + 40 }]}>
        {[1, 0.86, 0.94, 0.5].map((lineWidth, index) => (
          <View
            key={index}
            style={[
              styles.line,
              { width: `${lineWidth * 100}%`, backgroundColor: theme.line },
            ]}
          />
        ))}
      </View>
    </View>
  );

  const phone = (
    <Phone>
      <StackScreens stack={stack} first={list} second={details} />
      <FlightLayer flight={flight} />
    </Phone>
  );

  return (
    <DemoLayout width={width} phone={phone}>
      <Segmented
        label="Tag of the photo on the details screen"
        value={mode}
        options={TAG_MODES}
        onChange={setMode}
      />
      <Caption>
        {matches
          ? `Both photos have the tag "${place.id}", so the photo flies to its new place.`
          : 'The tags do not match. The screen changes without a shared transition.'}
      </Caption>
    </DemoLayout>
  );
}

interface TagChipProps {
  theme: DemoTheme;
  tag: string | undefined;
  state: 'neutral' | 'match' | 'mismatch';
}

function TagChip({ theme, tag, state }: TagChipProps) {
  const color =
    state === 'match'
      ? '#2e9b78'
      : state === 'mismatch'
        ? '#d9534f'
        : theme.subtle;
  return (
    <View style={[styles.chip, { borderColor: color }]}>
      <Text style={[styles.chipText, { color, fontFamily: theme.mono }]}>
        {tag === undefined ? 'no tag' : `tag="${tag}"`}
      </Text>
    </View>
  );
}

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
    gap: 10,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: 12,
    overflow: 'hidden',
  },
  rowText: {
    flex: 1,
    gap: 5,
    alignItems: 'flex-start',
  },
  rowTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  photo: {
    position: 'absolute',
    borderRadius: 20,
    overflow: 'hidden',
  },
  body: {
    position: 'absolute',
    left: 14,
    right: 14,
    gap: 9,
  },
  line: {
    height: 7,
    borderRadius: 4,
  },
  detailsChip: {
    position: 'absolute',
    left: 14,
  },
  chip: {
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderWidth: 1,
    borderRadius: 4,
  },
  chipText: {
    fontSize: 9,
  },
});
