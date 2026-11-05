import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, LinearGradient, Rect, Stop } from 'react-native-svg';

import {
  CodeLine,
  DemoLayout,
  Panel,
  PanelRow,
  PanelSlider,
  PanelSwitch,
} from './kit/controls';
import {
  Box,
  DEFAULT_DURATION,
  FlightLayer,
  SharedContent,
  allChannels,
  timing,
  useFlight,
} from './kit/flight';
import { Phone, SCREEN_WIDTH, STATUS_BAR_HEIGHT } from './kit/Phone';
import {
  HEADER_BOTTOM,
  NavHeader,
  StackScreens,
  useScreenStack,
} from './kit/Stack';
import { useDemoTheme } from './kit/theme';

const SLOW_MOTION = 3;
const ICON_BACKGROUND = 'rgba(255, 255, 255, 0.3)';
const LIST_TOP = STATUS_BAR_HEIGHT + 58;
const CARD_HEIGHT = 66;
const HEADER_HEIGHT = 200;
const CARD_ICON = { inset: 14, size: 38 };
const HEADER_ICON = { top: 30, size: 66 };

const ITEMS = [
  {
    id: 'sun',
    name: 'Sun',
    subtitle: 'Clear sky all day',
    color: '#f6a04d',
    icon: '☀',
  },
  {
    id: 'moon',
    name: 'Moon',
    subtitle: 'A calm night',
    color: '#6f74c9',
    icon: '☾',
  },
  {
    id: 'leaf',
    name: 'Leaf',
    subtitle: 'Spring in the park',
    color: '#5fae95',
    icon: '❀',
  },
  {
    id: 'wave',
    name: 'Wave',
    subtitle: 'A day at the sea',
    color: '#4f9fd8',
    icon: '≈',
  },
];

type Item = (typeof ITEMS)[number];

function cardBox(index: number, item: Item): Box {
  return {
    x: 14,
    y: LIST_TOP + index * (CARD_HEIGHT + 10),
    width: SCREEN_WIDTH - 28,
    height: CARD_HEIGHT,
    borderRadius: 18,
    backgroundColor: item.color,
  };
}

function headerBox(item: Item): Box {
  return {
    x: 14,
    y: HEADER_BOTTOM + 8,
    width: SCREEN_WIDTH - 28,
    height: HEADER_HEIGHT,
    borderRadius: 24,
    backgroundColor: item.color,
  };
}

function listFadeKey(item: Item) {
  return `list-${item.id}`;
}

function detailsFadeKey(item: Item) {
  return `details-${item.id}`;
}

function iconTag(item: Item) {
  return `${item.id}-icon`;
}

function cardIconBox(index: number, item: Item): Box {
  const card = cardBox(index, item);
  const shrink = (HEADER_ICON.size - CARD_ICON.size) / 2;
  return {
    x: card.x + CARD_ICON.inset - shrink,
    y: card.y + (CARD_HEIGHT - CARD_ICON.size) / 2 - shrink,
    width: HEADER_ICON.size,
    height: HEADER_ICON.size,
    borderRadius: HEADER_ICON.size / 2,
    backgroundColor: ICON_BACKGROUND,
    scale: CARD_ICON.size / HEADER_ICON.size,
  };
}

function headerIconBox(item: Item): Box {
  const header = headerBox(item);
  return {
    x: header.x + (header.width - HEADER_ICON.size) / 2,
    y: header.y + HEADER_ICON.top,
    width: HEADER_ICON.size,
    height: HEADER_ICON.size,
    borderRadius: HEADER_ICON.size / 2,
    backgroundColor: ICON_BACKGROUND,
  };
}

export default function FadeContentDemo({ width }: { width?: number }) {
  const theme = useDemoTheme();
  const [fadeContent, setFadeContent] = useState(true);
  const [fadeOutEnd, setFadeOutEnd] = useState(1);
  const [fadeInDuration, setFadeInDuration] = useState(DEFAULT_DURATION / 2);
  const [slowMotion, setSlowMotion] = useState(true);
  const [iconHasTag, setIconHasTag] = useState(false);
  const [selected, setSelected] = useState(0);
  const factor = slowMotion ? SLOW_MOTION : 1;
  const stack = useScreenStack(factor);
  const flight = useFlight();
  const clock = useSharedValue(0);
  const item = ITEMS[selected];
  const busy = flight.pairs.length > 0;

  const fly = (
    from: Box,
    to: Box,
    flyingItem: Item,
    content: React.ReactNode,
    icon: { from: Box; to: Box; content: React.ReactNode },
    fadeTarget: string
  ) => {
    const total = DEFAULT_DURATION + (fadeContent ? fadeInDuration : 0);
    clock.value = 0;
    clock.value = withTiming(total, {
      duration: total * factor,
      easing: Easing.linear,
    });
    flight.start({
      pairs: [
        { tag: flyingItem.id, from, to, content },
        ...(iconHasTag
          ? [{ tag: iconTag(flyingItem), ...icon, fades: false }]
          : []),
      ],
      animations: allChannels(timing(DEFAULT_DURATION * factor)),
      fadeContent: fadeContent
        ? { fadeOutEnd, fadeInDuration: fadeInDuration * factor }
        : null,
      fadeTarget,
    });
  };

  const open = (index: number) => {
    if (busy || stack.top !== 'first') {
      return;
    }
    setSelected(index);
    fly(
      cardBox(index, ITEMS[index]),
      headerBox(ITEMS[index]),
      ITEMS[index],
      <CardContent item={ITEMS[index]} iconHasTag={iconHasTag} />,
      {
        from: cardIconBox(index, ITEMS[index]),
        to: headerIconBox(ITEMS[index]),
        content: <IconGlyph item={ITEMS[index]} size="header" />,
      },
      detailsFadeKey(ITEMS[index])
    );
    stack.push();
  };

  const back = () => {
    if (busy || stack.top !== 'second') {
      return;
    }
    fly(
      headerBox(item),
      cardBox(selected, item),
      item,
      <HeaderContent item={item} iconHasTag={iconHasTag} />,
      {
        from: headerIconBox(item),
        to: cardIconBox(selected, item),
        content: <IconGlyph item={item} size="header" />,
      },
      listFadeKey(item)
    );
    stack.pop();
  };

  const hidden = (tag: string) => ({ opacity: flight.isFlying(tag) ? 0 : 1 });

  const list = (
    <View style={styles.fill}>
      <Text style={[styles.title, { color: theme.text }]}>Today</Text>
      {ITEMS.map((listItem, index) => {
        const box = cardBox(index, listItem);
        return (
          <Pressable
            key={listItem.id}
            disabled={busy}
            onPress={() => open(index)}
            style={[styles.card, frame(box), hidden(listItem.id)]}>
            <SharedContent flight={flight} fadeKey={listFadeKey(listItem)}>
              <CardContent item={listItem} iconHasTag={iconHasTag} />
            </SharedContent>
            {iconHasTag && (
              <TaggedIcon
                box={offset(cardIconBox(index, listItem), box)}
                hidden={flight.isFlying(iconTag(listItem))}>
                <IconGlyph item={listItem} size="header" />
              </TaggedIcon>
            )}
          </Pressable>
        );
      })}
    </View>
  );

  const details = (
    <View style={styles.fill}>
      <NavHeader
        title={item.name}
        onBack={busy ? () => {} : back}
        backButtonDisplayMode="minimal"
      />
      <View style={[styles.card, frame(headerBox(item)), hidden(item.id)]}>
        <SharedContent flight={flight} fadeKey={detailsFadeKey(item)}>
          <HeaderContent item={item} iconHasTag={iconHasTag} />
        </SharedContent>
        {iconHasTag && (
          <TaggedIcon
            box={offset(headerIconBox(item), headerBox(item))}
            hidden={flight.isFlying(iconTag(item))}>
            <IconGlyph item={item} size="header" />
          </TaggedIcon>
        )}
      </View>
      <View style={styles.body}>
        {[1, 0.85, 0.95, 0.5].map((lineWidth, index) => (
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

  const code = fadeContent
    ? `SharedTransition.fadeContent({\n  fadeOut: { end: ${fadeOutEnd} },\n  fadeIn: { duration: ${fadeInDuration} },\n})`
    : 'SharedTransition';

  const timeline = (
    <Timeline
      clock={clock}
      fadeContent={fadeContent}
      fadeOutEnd={fadeOutEnd}
      fadeInDuration={fadeInDuration}
    />
  );
  const fadeSettings = (
    <>
      <PanelRow
        title="Icon has its own tag"
        accessory={
          <PanelSwitch
            label="Icon has its own tag"
            value={iconHasTag}
            onChange={setIconHasTag}
          />
        }
      />
      <PanelRow
        title="fadeContent()"
        accessory={
          <PanelSwitch
            label="fadeContent()"
            value={fadeContent}
            onChange={setFadeContent}
          />
        }
      />
      <PanelRow title="fadeOut.end" hint={fadeOutEnd.toFixed(2)}>
        <PanelSlider
          label="fadeOut.end"
          value={fadeOutEnd}
          min={0.1}
          max={1}
          step={0.05}
          onChange={setFadeOutEnd}
          disabled={!fadeContent}
        />
      </PanelRow>
      <PanelRow title="fadeIn.duration" hint={`${fadeInDuration} ms`}>
        <PanelSlider
          label="fadeIn.duration"
          value={fadeInDuration}
          min={0}
          max={1000}
          step={50}
          onChange={setFadeInDuration}
          disabled={!fadeContent}
        />
      </PanelRow>
      <PanelRow
        title="Slow motion"
        hint={`×${SLOW_MOTION}`}
        accessory={
          <PanelSwitch
            label="Slow motion"
            value={slowMotion}
            onChange={setSlowMotion}
          />
        }
      />
    </>
  );

  return (
    <DemoLayout width={width} phone={phone}>
      <Panel>
        {fadeSettings}
        <PanelRow title="Code">
          <CodeLine>{code}</CodeLine>
        </PanelRow>
        <PanelRow title="What you see">{timeline}</PanelRow>
      </Panel>
    </DemoLayout>
  );
}

function CardContent({ item, iconHasTag }: ContentProps) {
  return (
    <View style={styles.cardContent}>
      <View style={[styles.cardIcon, iconHasTag && styles.placeholder]}>
        <IconGlyph item={item} size="card" />
      </View>
      <View>
        <Text style={styles.cardName}>{item.name}</Text>
        <Text style={styles.cardSubtitle}>{item.subtitle}</Text>
      </View>
    </View>
  );
}

interface ContentProps {
  item: Item;
  iconHasTag: boolean;
}

function HeaderContent({ item, iconHasTag }: ContentProps) {
  return (
    <View style={styles.headerContent}>
      <View style={[styles.headerIcon, iconHasTag && styles.placeholder]}>
        <IconGlyph item={item} size="header" />
      </View>
      <Text style={styles.headerName}>{item.name}</Text>
      <View style={styles.chips}>
        {['22°', 'Wind 3', 'UV 4'].map((chip) => (
          <View key={chip} style={styles.chip}>
            <Text style={styles.chipText}>{chip}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function IconGlyph({ item, size }: { item: Item; size: 'card' | 'header' }) {
  return (
    <View style={styles.glyph}>
      <Text
        style={size === 'card' ? styles.cardIconText : styles.headerIconText}>
        {item.icon}
      </Text>
    </View>
  );
}

function TaggedIcon({
  box,
  hidden,
  children,
}: {
  box: Box;
  hidden: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={[styles.taggedIcon, frame(box), { opacity: hidden ? 0 : 1 }]}>
      {children}
    </View>
  );
}

function offset(box: Box, parent: Box): Box {
  return { ...box, x: box.x - parent.x, y: box.y - parent.y };
}

const TIMELINE_WIDTH = 300;
const LANE_HEIGHT = 14;

interface TimelineProps {
  clock: SharedValue<number>;
  fadeContent: boolean;
  fadeOutEnd: number;
  fadeInDuration: number;
}

function Timeline({
  clock,
  fadeContent,
  fadeOutEnd,
  fadeInDuration,
}: TimelineProps) {
  const theme = useDemoTheme();
  const [width, setWidth] = useState(TIMELINE_WIDTH);
  const total = DEFAULT_DURATION + 1000;
  const toX = (time: number) => (time / total) * width;
  const moveEnd = toX(DEFAULT_DURATION);
  const fadeOutX = fadeContent
    ? toX(DEFAULT_DURATION * timeOfProgress(fadeOutEnd))
    : moveEnd;
  const fadeInX = fadeContent ? toX(fadeInDuration) : 0;

  const playhead = useAnimatedStyle(() => ({
    opacity: clock.value > 0 && clock.value < total ? 1 : 0,
    transform: [{ translateX: (clock.value / total) * width }],
  }));

  const lanes = [
    { label: 'move', y: 0 },
    { label: 'old children', y: 1 },
    { label: 'new children', y: 2 },
  ];

  return (
    <View
      style={styles.timeline}
      onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
      <Svg width={width} height={3 * (LANE_HEIGHT + 18)}>
        <Defs>
          <LinearGradient id="out" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor={theme.accent} stopOpacity={1} />
            <Stop
              offset="1"
              stopColor={theme.accent}
              stopOpacity={fadeContent ? 0.05 : 1}
            />
          </LinearGradient>
          <LinearGradient id="in" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor={theme.target} stopOpacity={0.05} />
            <Stop offset="1" stopColor={theme.target} stopOpacity={1} />
          </LinearGradient>
        </Defs>
        {lanes.map((lane) => (
          <Rect
            key={lane.label}
            x={0}
            y={lane.y * (LANE_HEIGHT + 18) + 14}
            width={width}
            height={LANE_HEIGHT}
            rx={4}
            fill={theme.line}
          />
        ))}
        <Rect
          x={0}
          y={14}
          width={moveEnd}
          height={LANE_HEIGHT}
          rx={4}
          fill={theme.subtle}
        />
        <Rect
          x={0}
          y={LANE_HEIGHT + 32}
          width={Math.max(2, fadeOutX)}
          height={LANE_HEIGHT}
          rx={4}
          fill="url(#out)"
        />
        <Rect
          x={moveEnd}
          y={2 * (LANE_HEIGHT + 18) + 14}
          width={Math.max(3, fadeInX)}
          height={LANE_HEIGHT}
          rx={fadeInX > 6 ? 4 : 1}
          fill={fadeInX > 0 ? 'url(#in)' : theme.target}
        />
      </Svg>
      {lanes.map((lane) => (
        <Text
          key={lane.label}
          style={[
            styles.laneLabel,
            { top: lane.y * (LANE_HEIGHT + 18), color: theme.subtle },
          ]}>
          {lane.label}
        </Text>
      ))}
      <Animated.View
        style={[styles.playhead, { backgroundColor: theme.text }, playhead]}
      />
    </View>
  );
}

// The fade-out follows the move progress. This is the inverse of Easing.inOut(Easing.quad).
function timeOfProgress(progress: number) {
  return progress < 0.5
    ? Math.sqrt(progress / 2)
    : 1 - Math.sqrt((1 - progress) / 2);
}

function frame(box: Box) {
  return {
    left: box.x,
    top: box.y,
    width: box.width,
    height: box.height,
    borderRadius: box.borderRadius,
    backgroundColor: box.backgroundColor,
    transform: [{ scale: box.scale ?? 1 }],
  };
}

const styles = StyleSheet.create({
  fill: {
    flex: 1,
  },
  title: {
    position: 'absolute',
    top: STATUS_BAR_HEIGHT + 12,
    left: 16,
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  card: {
    position: 'absolute',
    overflow: 'hidden',
  },
  cardContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 12,
  },
  cardIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ICON_BACKGROUND,
  },
  cardIconText: {
    fontSize: 20,
    color: '#ffffff',
  },
  cardName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#ffffff',
  },
  cardSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.85)',
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
    paddingTop: HEADER_ICON.top,
    gap: 6,
  },
  placeholder: {
    opacity: 0,
  },
  glyph: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  taggedIcon: {
    position: 'absolute',
    overflow: 'hidden',
  },
  headerIcon: {
    width: 66,
    height: 66,
    borderRadius: 33,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: ICON_BACKGROUND,
  },
  headerIconText: {
    fontSize: 36,
    color: '#ffffff',
  },
  headerName: {
    fontSize: 24,
    fontWeight: '800',
    color: '#ffffff',
  },
  chips: {
    flexDirection: 'row',
    gap: 6,
  },
  chip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
  },
  chipText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  body: {
    position: 'absolute',
    top: HEADER_BOTTOM + 8 + HEADER_HEIGHT + 18,
    left: 16,
    right: 16,
    gap: 9,
  },
  line: {
    height: 7,
    borderRadius: 4,
  },
  timeline: {
    width: '100%',
    maxWidth: TIMELINE_WIDTH,
  },
  laneLabel: {
    position: 'absolute',
    left: 0,
    fontSize: 10,
  },
  playhead: {
    position: 'absolute',
    top: 10,
    left: 0,
    width: 2,
    height: 3 * (LANE_HEIGHT + 18) - 8,
    borderRadius: 1,
  },
});
