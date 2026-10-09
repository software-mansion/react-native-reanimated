import type { ReactNode } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import type { SharedValue } from 'react-native-reanimated';
import Animated, {
  Easing,
  makeMutable,
  useAnimatedStyle,
  useDerivedValue,
  withTiming,
} from 'react-native-reanimated';
import { runOnUISync } from 'react-native-worklets';

import {
  describe,
  expect,
  getTestComponent,
  mockAnimationTimer,
  notify,
  render,
  test,
  unmockAnimationTimer,
  useTestRef,
  wait,
  waitForFrames,
  waitForNotification,
  waitUntilSettled,
} from '../../../ReJest/RuntimeTestsApi';
import { ComparisonMode } from '../../../ReJest/types';
import { waitFor } from '../../../ReJest/utils/waitFor';

const TEXT_REF = 'AnimatedText';
const ANIMATION_FINISHED = 'ANIMATED_TEXT_FINISHED';
const DURATION = 500;
const FRAME_MS = 16;
const MAX_STEP_PER_FRAME = 4;
// See props/syncBackToReact.test.tsx.
const SYNC_BACK_DELAY_MS = 2000;
const EMPTY_TEXT = '\u200b';

const ORIGINAL_UPDATE_PROPS = '__animatedTextTestOriginalUpdateProps';

type PropRecording = {
  values(prop: string): unknown[];
  calls(): number;
  stop(): void;
};

/** Records the given props from every `_updateProps` call on the UI thread. */
function startPropRecording(props: string[]): PropRecording {
  const log = makeMutable<Array<Record<string, unknown>>>([]);
  const callCount = makeMutable(0);
  runOnUISync(() => {
    'worklet';
    const g = global as unknown as Record<string, unknown>;
    // Left over by a test that failed before `stop()`.
    if (g[ORIGINAL_UPDATE_PROPS]) {
      global._updateProps = g[
        ORIGINAL_UPDATE_PROPS
      ] as typeof global._updateProps;
    }
    const original = global._updateProps;
    g[ORIGINAL_UPDATE_PROPS] = original;
    global._updateProps = (operations) => {
      const entries: Array<Record<string, unknown>> = [];
      for (const { updates } of operations) {
        for (const prop of props) {
          if (prop in updates) {
            entries.push({
              [prop]: (updates as Record<string, unknown>)[prop],
            });
          }
        }
      }
      callCount.value += 1;
      if (entries.length > 0) {
        log.modify((recorded) => {
          'worklet';
          recorded.push(...entries);
          return recorded;
        });
      }
      original(operations);
    };
  });
  return {
    values: (prop) =>
      runOnUISync(() => {
        'worklet';
        return log.value
          .filter((entry) => prop in entry)
          .map((entry) => entry[prop]);
      }),
    calls: () =>
      runOnUISync(() => {
        'worklet';
        return callCount.value;
      }),
    stop: () =>
      runOnUISync(() => {
        'worklet';
        const g = global as unknown as Record<string, unknown>;
        if (g[ORIGINAL_UPDATE_PROPS]) {
          global._updateProps = g[
            ORIGINAL_UPDATE_PROPS
          ] as typeof global._updateProps;
          g[ORIGINAL_UPDATE_PROPS] = undefined;
        }
      }),
  };
}

// `waitForFrames(n)` with n > 1 breaks the UI frame loop.
async function waitTwoFrames() {
  await waitForFrames(1);
  await waitForFrames(1);
}

const ROW = {
  STRING: 'string',
  NUMBER: 'number',
  EMPTY: "'' <-> 'Blink'",
  SUFFIX: '{sv}%',
  AROUND: 'Before{sv}After',
  MULTI: 'Before{a}Middle{b}After',
  IN_TEXT: 'inside Text',
  IN_ANIMATED: 'inside Animated.Text with animated fontSize',
  LINES: 'numberOfLines={1}',
  OPACITY: 'animated opacity on the outer text',
  LAYOUT: 'onLayout',
  STATIC: 'static Animated.Text',
} as const;
type Row = (typeof ROW)[keyof typeof ROW];

const MEASURED_ROWS: Row[] = Object.values(ROW);
const GROWING_ROWS: Row[] = [
  ROW.STRING,
  ROW.NUMBER,
  ROW.EMPTY,
  ROW.SUFFIX,
  ROW.AROUND,
  ROW.MULTI,
  ROW.IN_TEXT,
  ROW.IN_ANIMATED,
  ROW.OPACITY,
  ROW.LAYOUT,
];
const FIXED_HEIGHT_ROWS: Row[] = [ROW.EMPTY, ROW.LINES];
// Every shared value in a counter row. Before{a}Middle{b}After has two, so it
// gets two updates per frame.
const COUNTER_VIEWS = 11;

function AnimatedTextScreen({
  progress,
  onLayoutWidth,
}: {
  progress: SharedValue<number>;
  onLayoutWidth?: (width: number) => void;
}) {
  const refs = {
    [ROW.STRING]: useTestRef(ROW.STRING),
    [ROW.NUMBER]: useTestRef(ROW.NUMBER),
    [ROW.EMPTY]: useTestRef(ROW.EMPTY),
    [ROW.SUFFIX]: useTestRef(ROW.SUFFIX),
    [ROW.AROUND]: useTestRef(ROW.AROUND),
    [ROW.MULTI]: useTestRef(ROW.MULTI),
    [ROW.IN_TEXT]: useTestRef(ROW.IN_TEXT),
    [ROW.IN_ANIMATED]: useTestRef(ROW.IN_ANIMATED),
    [ROW.LINES]: useTestRef(ROW.LINES),
    [ROW.OPACITY]: useTestRef(ROW.OPACITY),
    [ROW.LAYOUT]: useTestRef(ROW.LAYOUT),
    [ROW.STATIC]: useTestRef(ROW.STATIC),
  };

  const textSv = useDerivedValue(() => String(Math.round(progress.value)));
  const numberSv = useDerivedValue(() => Math.round(progress.value));
  const emptySv = useDerivedValue<string>(() =>
    progress.value > 50 ? 'Blink' : ''
  );
  const fontSizeStyle = useAnimatedStyle(() => ({
    fontSize: 14 + Math.round(progress.value) / 10,
  }));
  const opacityStyle = useAnimatedStyle(() => ({
    opacity: 0.2 + progress.value * 0.008,
  }));

  return (
    <View style={styles.screen}>
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text ref={refs[ROW.STRING]} style={styles.color1}>
          {textSv}
        </Animated.Text>
        <Text>After</Text>
      </View>
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text ref={refs[ROW.NUMBER]} style={styles.color2}>
          {numberSv}
        </Animated.Text>
        <Text>After</Text>
      </View>
      <View style={styles.row}>
        <Text>Before</Text>
        <Animated.Text ref={refs[ROW.EMPTY]} style={styles.color3}>
          {emptySv}
        </Animated.Text>
        <Text>After</Text>
      </View>
      <View style={styles.row}>
        <Animated.Text ref={refs[ROW.SUFFIX]} style={styles.color4}>
          {numberSv}%
        </Animated.Text>
      </View>
      <View style={styles.row}>
        <Animated.Text ref={refs[ROW.AROUND]} style={styles.color5}>
          Before{textSv}After
        </Animated.Text>
      </View>
      <View style={styles.row}>
        <Animated.Text ref={refs[ROW.MULTI]} style={styles.color6}>
          Before{textSv}Middle{numberSv}After
        </Animated.Text>
      </View>
      <View style={styles.row}>
        <Text ref={refs[ROW.IN_TEXT]} style={styles.italic}>
          Before
          <Animated.Text style={styles.color7}>{numberSv}</Animated.Text>
          After
        </Text>
      </View>
      <View style={styles.row}>
        <Animated.Text
          ref={refs[ROW.IN_ANIMATED]}
          style={[styles.italic, fontSizeStyle]}>
          Before
          <Animated.Text style={styles.color8}>{numberSv}</Animated.Text>
          After
        </Animated.Text>
      </View>
      <View style={[styles.row, styles.narrow]}>
        <Animated.Text
          ref={refs[ROW.LINES]}
          numberOfLines={1}
          style={styles.color1}>
          I am a long text and should be trimmed {textSv} tralalalalalala
        </Animated.Text>
      </View>
      <View style={styles.row}>
        <Animated.Text
          ref={refs[ROW.OPACITY]}
          style={[styles.color2, opacityStyle]}>
          My opacity changes {numberSv}
        </Animated.Text>
      </View>
      <View style={styles.row}>
        <Animated.Text
          ref={refs[ROW.LAYOUT]}
          style={styles.color3}
          onLayout={(event) => onLayoutWidth?.(event.nativeEvent.layout.width)}>
          My width grows with {textSv}
        </Animated.Text>
      </View>
      <View style={styles.row}>
        <Animated.Text ref={refs[ROW.STATIC]} style={styles.color4}>
          Lorem ipsum
        </Animated.Text>
      </View>
    </View>
  );
}

type Metrics = Record<string, { width: number; height: number }>;

async function measureScreen(): Promise<Metrics> {
  await waitTwoFrames();
  const json = await waitUntilSettled(async () => {
    const entries = await Promise.all(
      MEASURED_ROWS.map(async (row) => {
        const component = getTestComponent(row);
        return [
          row,
          {
            width: Number(await component.getAnimatedStyle('width')),
            height: Number(await component.getAnimatedStyle('height')),
          },
        ] as const;
      })
    );
    return JSON.stringify(Object.fromEntries(entries));
  });
  return JSON.parse(json) as Metrics;
}

type Group = { value: string; count: number };

async function recordScreenFrames(
  run: (recording: PropRecording) => Promise<void>
) {
  const frames = await recordTextFrames(run);
  const counter = frames.filter(
    (frame) => frame !== EMPTY_TEXT && frame !== 'Blink'
  );
  const empty = frames.filter(
    (frame) => frame === EMPTY_TEXT || frame === 'Blink'
  );
  return { counter: groupRepeats(counter), empty };
}

function groupRepeats(frames: string[]): Group[] {
  const groups: Group[] = [];
  for (const value of frames) {
    const last = groups[groups.length - 1];
    if (last?.value === value) {
      last.count++;
    } else {
      groups.push({ value, count: 1 });
    }
  }
  return groups;
}

function expectEveryViewGotEveryFrame(groups: Group[]) {
  const missed = groups.filter((group) => group.count !== COUNTER_VIEWS);
  expect(
    missed.length === 0
      ? `each frame reached ${COUNTER_VIEWS} views`
      : `frames with another count: ${missed
          .map((group) => `${group.value} x${group.count}`)
          .join(', ')}`
  ).toBe(`each frame reached ${COUNTER_VIEWS} views`);
}

function CounterText({ progress }: { progress: SharedValue<number> }) {
  const ref = useTestRef(TEXT_REF);
  const text = useDerivedValue(() => String(Math.round(progress.value)));
  return (
    <View style={styles.container}>
      <Animated.Text ref={ref} style={styles.text}>
        {text}
      </Animated.Text>
    </View>
  );
}

function CounterWithBox({ progress }: { progress: SharedValue<number> }) {
  const ref = useTestRef(TEXT_REF);
  const text = useDerivedValue(() => String(Math.round(progress.value)));
  const boxStyle = useAnimatedStyle(() => ({ width: progress.value }));
  return (
    <View style={styles.container}>
      <Animated.Text ref={ref} style={styles.text}>
        {text}
      </Animated.Text>
      <Animated.View style={[styles.box, boxStyle]} />
    </View>
  );
}

function MixedText({ progress }: { progress: SharedValue<number> }) {
  const ref = useTestRef(TEXT_REF);
  const text = useDerivedValue(() => String(Math.round(progress.value)));
  return (
    <View style={styles.container}>
      <Animated.Text ref={ref} style={styles.text}>
        Value: {text}%
      </Animated.Text>
    </View>
  );
}

function FadingCounterText({
  progress,
  opacity,
}: {
  progress: SharedValue<number>;
  opacity: SharedValue<number>;
}) {
  const ref = useTestRef(TEXT_REF);
  const text = useDerivedValue(() => String(Math.round(progress.value)));
  const fade = useAnimatedStyle(() => ({ opacity: opacity.value }));
  return (
    <View style={styles.container}>
      <Animated.Text ref={ref} style={[styles.text, fade]}>
        {text}
      </Animated.Text>
    </View>
  );
}

function StringText({ text }: { text: SharedValue<string> }) {
  const ref = useTestRef(TEXT_REF);
  return (
    <View style={styles.container}>
      <Animated.Text ref={ref} style={styles.text}>
        {text}
      </Animated.Text>
    </View>
  );
}

function NullableText({
  text,
}: {
  text: SharedValue<string | null | undefined>;
}) {
  const ref = useTestRef(TEXT_REF);
  return (
    <View style={styles.container}>
      <Animated.Text ref={ref} style={styles.text}>
        {text}
      </Animated.Text>
    </View>
  );
}

type FlagProps = { flag: boolean; progress: SharedValue<number> };

function NumberOrTextSv({ flag, progress }: FlagProps) {
  const ref = useTestRef(TEXT_REF);
  const numberSv = useDerivedValue(() => Math.round(progress.value));
  const textSv = useDerivedValue(() => `T${Math.round(progress.value)}`);
  return (
    <View style={styles.container}>
      <Animated.Text ref={ref} style={styles.text}>
        {flag ? numberSv : textSv}
      </Animated.Text>
    </View>
  );
}

type EmptyChild = '' | null | undefined;

const EMPTY_CHILDREN: Array<[string, EmptyChild]> = [
  ["''", ''],
  ['undefined', undefined],
  ['null', null],
];

function NumberSvOrEmpty({
  flag,
  progress,
  empty,
}: FlagProps & { empty: EmptyChild }) {
  const ref = useTestRef(TEXT_REF);
  const numberSv = useDerivedValue(() => Math.round(progress.value));
  return (
    <View style={styles.container}>
      <Animated.Text ref={ref} style={styles.text}>
        {flag ? numberSv : empty}
      </Animated.Text>
    </View>
  );
}

const STATIC_TEXT = 'Static';

function FadingTextWithFlag({
  flag,
  progress,
  mixed,
}: FlagProps & { mixed: boolean }) {
  const ref = useTestRef(TEXT_REF);
  const textSv = useDerivedValue(() => String(Math.round(progress.value)));
  const fade = useAnimatedStyle(() => ({
    opacity: 0.2 + progress.value * 0.008,
  }));
  if (!flag) {
    return (
      <View style={styles.container}>
        <Animated.Text ref={ref} style={[styles.text, fade]}>
          {STATIC_TEXT}
        </Animated.Text>
      </View>
    );
  }
  return (
    <View style={styles.container}>
      {mixed ? (
        <Animated.Text ref={ref} style={[styles.text, fade]}>
          Value: {textSv}%
        </Animated.Text>
      ) : (
        <Animated.Text ref={ref} style={[styles.text, fade]}>
          {textSv}
        </Animated.Text>
      )}
    </View>
  );
}

function TextSvOrMixed({ flag, progress }: FlagProps) {
  const ref = useTestRef(TEXT_REF);
  const textSv = useDerivedValue(() => String(Math.round(progress.value)));
  return (
    <View style={styles.container}>
      {flag ? (
        <Animated.Text ref={ref} style={styles.text}>
          {textSv}
        </Animated.Text>
      ) : (
        <Animated.Text ref={ref} style={styles.text}>
          Value: {textSv}%
        </Animated.Text>
      )}
    </View>
  );
}

const REFERENCE_REF = 'Reference';

function ReferenceText({
  index,
  children,
}: {
  index: number;
  children: ReactNode;
}) {
  const ref = useTestRef(`${REFERENCE_REF}${index}`);
  return (
    <Text ref={ref} style={styles.text}>
      {children}
    </Text>
  );
}

// `Value: {textSv}%` renders the shared value as a nested text.
function mixedReference(value: string) {
  return (
    <>
      Value: <Text>{value}</Text>%
    </>
  );
}

const NUMBER_FRAME = /^\d+$/;

// Replaces what was rendered, so call it before rendering the tested component.
async function measureReferences(
  texts: Record<string, ReactNode>
): Promise<Record<string, number>> {
  const keys = Object.keys(texts);
  await render(
    <View style={styles.container}>
      {keys.map((key, index) => (
        <ReferenceText key={key} index={index}>
          {texts[key]}
        </ReferenceText>
      ))}
    </View>
  );
  await waitTwoFrames();
  const json = await waitUntilSettled(async () =>
    JSON.stringify(
      await Promise.all(
        keys.map(async (_, index) =>
          Number(
            await getTestComponent(`${REFERENCE_REF}${index}`).getAnimatedStyle(
              'width'
            )
          )
        )
      )
    )
  );
  const widths = JSON.parse(json) as number[];
  await render(null);
  return Object.fromEntries(keys.map((key, index) => [key, widths[index]]));
}

async function expectShows(
  references: Record<string, number>,
  expected: string,
  step: string
) {
  const width = await readSettled('width');
  const reference = references[expected];
  expectRow(
    step,
    samePixels(width, reference),
    `shows "${expected}" (width ${width}, reference ${reference})`
  );
}

async function expectOpacity(expected: number, step: string) {
  await waitTwoFrames();
  const opacity = Number(
    await getTestComponent(TEXT_REF).getAnimatedStyle('opacity')
  );
  expectRow(
    step,
    Math.abs(opacity - expected) < 0.01,
    `has opacity ${expected} (got ${opacity})`
  );
}

const TOGGLE_DURATION = 2000;

async function toggleDuringAnimation(
  progress: SharedValue<number>,
  toValue: number,
  notificationName: string,
  flags: boolean[],
  show: (flag: boolean) => Promise<void>
) {
  animateTo(progress, toValue, notificationName, TOGGLE_DURATION);
  for (const flag of flags) {
    await wait(TOGGLE_DURATION / (flags.length + 2));
    await show(flag);
  }
  await waitForNotification(notificationName);
}

type FramesAfterSwitch = { children: string[]; opacity: number[] };

/** Returns what was sent to the UI in the window right after the switch. */
async function switchFlagMidAnimation(
  progress: SharedValue<number>,
  toValue: number,
  notificationName: string,
  flag: boolean,
  show: (flag: boolean) => Promise<void>
): Promise<FramesAfterSwitch> {
  const recording = startPropRecording(['children', 'opacity']);
  try {
    animateTo(progress, toValue, notificationName, TOGGLE_DURATION);
    await wait(TOGGLE_DURATION / 3);
    await show(flag);
    // Updates already queued for the old children may still land.
    await waitTwoFrames();
    const childrenBefore = recording.values('children').length;
    const opacityBefore = recording.values('opacity').length;
    await wait(TOGGLE_DURATION / 3);
    const frames = {
      children: recording.values('children').map(String).slice(childrenBefore),
      opacity: recording.values('opacity').map(Number).slice(opacityBefore),
    };
    await waitForNotification(notificationName);
    return frames;
  } finally {
    recording.stop();
  }
}

function expectTextKeepsAnimating(
  step: string,
  frames: string[],
  pattern: RegExp,
  toValue: number
) {
  const values = frames.map((frame) => Number(frame.replace(/\D/g, '')));
  expectRow(step, frames.length >= 10, `sends text updates (${frames.length})`);
  const wrong = frames.filter((frame) => !pattern.test(frame));
  expectRow(
    step,
    wrong.length === 0,
    `sends only ${pattern} (other: ${wrong.join(',')})`
  );
  expectRow(
    step,
    values.every(
      (value, i) =>
        i === 0 ||
        Math.abs(toValue - value) <= Math.abs(toValue - values[i - 1])
    ),
    `moves towards ${toValue} (${frames.join(',')})`
  );
}

function expectNoTextUpdates(step: string, frames: string[]) {
  expectRow(
    step,
    frames.length === 0,
    `sends no text updates (${frames.join(',')})`
  );
}

function expectOpacityKeepsAnimating(step: string, frames: number[]) {
  expectRow(
    step,
    frames.length >= 10,
    `sends opacity updates (${frames.length})`
  );
}

function expectedFrames(from: number, to: number) {
  const frames: string[] = [];
  for (let t = FRAME_MS; ; t += FRAME_MS) {
    const progress = Math.min(1, t / DURATION);
    frames.push(String(Math.round(from + (to - from) * progress)));
    if (progress === 1) {
      return frames;
    }
  }
}

function maxStep(frames: string[]) {
  let max = 0;
  for (let i = 1; i < frames.length; i++) {
    max = Math.max(max, Math.abs(Number(frames[i]) - Number(frames[i - 1])));
  }
  return max;
}

function directionChanges(frames: string[]) {
  let changes = 0;
  let previousDirection = 0;
  for (let i = 1; i < frames.length; i++) {
    const direction = Math.sign(Number(frames[i]) - Number(frames[i - 1]));
    if (
      direction !== 0 &&
      previousDirection !== 0 &&
      direction !== previousDirection
    ) {
      changes++;
    }
    if (direction !== 0) {
      previousDirection = direction;
    }
  }
  return changes;
}

// Puts the row name into the failure message.
function expectRow(row: string, ok: boolean, fact: string) {
  expect(ok ? `${row}: ${fact}` : `${row}: NOT ${fact}`).toBe(
    `${row}: ${fact}`
  );
}

function samePixels(a: number, b: number) {
  return Math.abs(a - b) < 1;
}

// Each awaited animation in a test needs its own notification name.
function animateTo(
  progress: SharedValue<number>,
  toValue: number,
  notificationName = ANIMATION_FINISHED,
  duration = DURATION
) {
  progress.value = withTiming(
    toValue,
    { duration, easing: Easing.linear },
    (finished) => {
      if (finished) {
        notify(notificationName);
      }
    }
  );
}

async function recordTextFrames(
  run: (recording: PropRecording) => Promise<void>
) {
  const recording = startPropRecording(['children']);
  try {
    await run(recording);
    return recording.values('children').map(String);
  } finally {
    recording.stop();
  }
}

async function readSettled(prop: 'width' | 'height') {
  await waitTwoFrames();
  return waitUntilSettled(async () =>
    Number(await getTestComponent(TEXT_REF).getAnimatedStyle(prop))
  );
}

describe('Animated.Text with a shared value as children', () => {
  describe('all rows at once', () => {
    test('every row follows 0 -> 100 and back 100 -> 0', async () => {
      const progress = makeMutable(0);
      const layoutWidths: number[] = [];
      await render(
        <AnimatedTextScreen
          progress={progress}
          onLayoutWidth={(width) => layoutWidths.push(width)}
        />
      );
      await mockAnimationTimer();
      const atZero = await measureScreen();

      const up = await recordScreenFrames(async () => {
        animateTo(progress, 100, 'UP_FINISHED');
        await waitForNotification('UP_FINISHED');
      });
      const atHundred = await measureScreen();
      const opacityAtHundred = Number(
        await getTestComponent(ROW.OPACITY).getAnimatedStyle('opacity')
      );

      const down = await recordScreenFrames(async () => {
        animateTo(progress, 0, 'DOWN_FINISHED');
        await waitForNotification('DOWN_FINISHED');
      });
      const backAtZero = await measureScreen();
      const opacityBackAtZero = Number(
        await getTestComponent(ROW.OPACITY).getAnimatedStyle('opacity')
      );
      await unmockAnimationTimer();

      expect(up.counter.map((group) => group.value).join(',')).toBe(
        expectedFrames(0, 100).join(',')
      );
      expect(down.counter.map((group) => group.value).join(',')).toBe(
        expectedFrames(100, 0).join(',')
      );
      expectEveryViewGotEveryFrame(up.counter);
      expectEveryViewGotEveryFrame(down.counter);
      expect(up.empty.join(',')).toBe('Blink');
      expect(down.empty.join(',')).toBe(EMPTY_TEXT);

      for (const row of GROWING_ROWS) {
        expectRow(
          row,
          atHundred[row].width > atZero[row].width,
          'is wider at 100 than at 0'
        );
      }
      for (const row of FIXED_HEIGHT_ROWS) {
        expectRow(
          row,
          samePixels(atHundred[row].height, atZero[row].height),
          'keeps its height'
        );
      }
      expectRow(
        ROW.STATIC,
        samePixels(atHundred[ROW.STATIC].width, atZero[ROW.STATIC].width),
        'is not touched'
      );
      for (const row of MEASURED_ROWS) {
        expectRow(
          row,
          samePixels(backAtZero[row].width, atZero[row].width) &&
            samePixels(backAtZero[row].height, atZero[row].height),
          'is back to its size at 0'
        );
      }

      expect(opacityAtHundred).toBe(1, ComparisonMode.FLOAT_DISTANCE);
      expect(opacityBackAtZero).toBe(0.2, ComparisonMode.FLOAT_DISTANCE);

      // onLayout tests are disabled on Android, see suites.ts.
      if (Platform.OS === 'ios') {
        expectRow(
          ROW.LAYOUT,
          samePixels(Math.max(...layoutWidths), atHundred[ROW.LAYOUT].width),
          'reported its width at 100 through onLayout'
        );
        expectRow(
          ROW.LAYOUT,
          samePixels(
            layoutWidths[layoutWidths.length - 1],
            atZero[ROW.LAYOUT].width
          ),
          'reported its width at 0 through onLayout'
        );
      }
    });

    test('stress: every row survives many toggles before reaching the end', async () => {
      const progress = makeMutable(0);
      await render(<AnimatedTextScreen progress={progress} />);
      await mockAnimationTimer();
      const atZero = await measureScreen();

      // Frames per direction. Odd count, so the last animation goes down to 0.
      const SEGMENTS = [10, 5, 12, 4, 8, 10, 6, 4, 15, 6, 5];
      const { counter, empty } = await recordScreenFrames(async (recording) => {
        let framesSoFar = 0;
        let target = 100;
        for (const length of SEGMENTS) {
          animateTo(progress, target, 'INTERRUPTED');
          framesSoFar += length;
          const frames = framesSoFar;
          await waitFor(() => recording.calls() >= frames, {
            description: `${frames} animated frames`,
          });
          target = target === 100 ? 0 : 100;
        }
        animateTo(progress, target, 'STRESS_FINISHED');
        await waitForNotification('STRESS_FINISHED');
      });
      const atEnd = await measureScreen();
      await unmockAnimationTimer();

      const frames = counter.map((group) => group.value);
      const values = frames.map(Number);
      expect(`${directionChanges(frames)} turns`).toBe(
        `${SEGMENTS.length} turns`
      );
      expectEveryViewGotEveryFrame(counter);
      expect(`max step ${maxStep(frames)}`).toBe(
        `max step ${Math.min(maxStep(frames), MAX_STEP_PER_FRAME)}`
      );
      expect(values.indexOf(0)).toBe(values.length - 1);
      expect(values.includes(100)).toBe(false);
      expect(empty.every((frame, i) => i === 0 || frame !== empty[i - 1])).toBe(
        true
      );
      expect(empty[empty.length - 1]).toBe(EMPTY_TEXT);

      for (const row of MEASURED_ROWS) {
        expectRow(
          row,
          samePixels(atEnd[row].width, atZero[row].width) &&
            samePixels(atEnd[row].height, atZero[row].height),
          'ends at its size at 0'
        );
      }
    });

    test('a re-render after sync-back keeps every row, in both directions', async () => {
      const progress = makeMutable(0);
      const screen = () => <AnimatedTextScreen progress={progress} />;
      await render(screen());
      const atZero = await measureScreen();

      animateTo(progress, 100, 'UP_FINISHED');
      await waitForNotification('UP_FINISHED');
      const atHundred = await measureScreen();
      await wait(SYNC_BACK_DELAY_MS);
      await render(screen());
      const atHundredAfterRerender = await measureScreen();

      animateTo(progress, 0, 'DOWN_FINISHED');
      await waitForNotification('DOWN_FINISHED');
      await wait(SYNC_BACK_DELAY_MS);
      await render(screen());
      const atZeroAfterRerender = await measureScreen();

      for (const row of MEASURED_ROWS) {
        expectRow(
          row,
          samePixels(atHundredAfterRerender[row].width, atHundred[row].width),
          'keeps 100 after the re-render'
        );
        expectRow(
          row,
          samePixels(atZeroAfterRerender[row].width, atZero[row].width),
          'keeps 0 after the re-render'
        );
      }
    });
  });

  describe('single row', () => {
    test('mixed children animate the shared value', async () => {
      const progress = makeMutable(0);
      await render(<MixedText progress={progress} />);
      await mockAnimationTimer();
      const widthAtZero = await readSettled('width');

      const frames = await recordTextFrames(async () => {
        animateTo(progress, 100);
        await waitForNotification(ANIMATION_FINISHED);
      });
      const widthAtHundred = await readSettled('width');
      await unmockAnimationTimer();

      expect(frames.join(',')).toBe(expectedFrames(0, 100).join(','));
      expect(widthAtHundred > widthAtZero).toBe(true);
    });

    test('keeps updating while the JS thread is blocked', async () => {
      const progress = makeMutable(0);
      await render(<CounterWithBox progress={progress} />);
      await mockAnimationTimer();

      const recording = startPropRecording(['children', 'width']);
      // A write from JS would not start until the busy loop ends.
      runOnUISync(() => {
        'worklet';
        progress.value = withTiming(
          100,
          { duration: 2000, easing: Easing.linear },
          (finished) => {
            if (finished) {
              notify(ANIMATION_FINISHED);
            }
          }
        );
      });
      await waitFor(() => recording.values('children').length >= 3, {
        description: 'the text to start animating',
      });

      // `box` and `uiFrames` are controls: if they stop too, the text is not
      // to blame.
      const readUiFrames = () =>
        runOnUISync(() => {
          'worklet';
          return global.framesCount ?? 0;
        });
      const read = () => ({
        text: recording.values('children').length,
        box: recording.values('width').length,
        uiFrames: readUiFrames(),
      });
      const before = read();

      const blockStart = performance.now();
      while (performance.now() < blockStart + 500) {
        // busy loop
      }

      const after = read();
      await waitForNotification(ANIMATION_FINISHED);
      recording.stop();
      await unmockAnimationTimer();

      const report =
        `text +${after.text - before.text}, ` +
        `box +${after.box - before.box}, ` +
        `UI frames +${after.uiFrames - before.uiFrames}`;
      // ~30 frames in 500 ms; simulators drop frames.
      const textKeptGoing = after.text - before.text >= 10;
      expect(`${report}: ${textKeptGoing ? 'ok' : 'text stopped'}`).toBe(
        `${report}: ok`
      );
    });

    test('text and opacity animate together on the same node', async () => {
      const progress = makeMutable(0);
      const opacity = makeMutable(1);
      await render(<FadingCounterText progress={progress} opacity={opacity} />);
      await mockAnimationTimer();
      const widthAtZero = await readSettled('width');

      const recording = startPropRecording(['children', 'opacity']);
      opacity.value = withTiming(0.2, {
        duration: DURATION,
        easing: Easing.linear,
      });
      animateTo(progress, 100);
      await waitForNotification(ANIMATION_FINISHED);
      const textFrames = recording.values('children').map(String);
      const opacityFrames = recording.values('opacity').map(Number);
      recording.stop();
      await unmockAnimationTimer();

      expect(textFrames.join(',')).toBe(expectedFrames(0, 100).join(','));
      expect(opacityFrames.length > 10).toBe(true);
      expect(
        opacityFrames.every((v, i) => i === 0 || v <= opacityFrames[i - 1])
      ).toBe(true);
      expect(
        Number(await getTestComponent(TEXT_REF).getAnimatedStyle('opacity'))
      ).toBe(0.2, ComparisonMode.FLOAT_DISTANCE);
      expect((await readSettled('width')) > widthAtZero).toBe(true);
    });

    test('a text update keeps the opacity, an opacity update keeps the text', async () => {
      const progress = makeMutable(0);
      const opacity = makeMutable(1);
      await render(<FadingCounterText progress={progress} opacity={opacity} />);
      const component = getTestComponent(TEXT_REF);
      const readOpacity = async () => {
        await waitTwoFrames();
        return Number(await component.getAnimatedStyle('opacity'));
      };

      opacity.value = 0.3;
      const widthAtZero = await readSettled('width');
      expect(await readOpacity()).toBe(0.3, ComparisonMode.FLOAT_DISTANCE);

      progress.value = 100;
      const widthAtHundred = await readSettled('width');
      expect(await readOpacity()).toBe(0.3, ComparisonMode.FLOAT_DISTANCE);

      opacity.value = 0.6;
      expect(await readOpacity()).toBe(0.6, ComparisonMode.FLOAT_DISTANCE);
      expect(await readSettled('width')).toBe(
        widthAtHundred,
        ComparisonMode.PIXEL
      );
      expect(widthAtHundred > widthAtZero).toBe(true);
    });

    test('width follows the number of digits in both directions', async () => {
      const progress = makeMutable(9);
      await render(<CounterText progress={progress} />);

      const widths: number[] = [];
      for (const value of [9, 10, 100, 99, 9]) {
        progress.value = value;
        widths.push(await readSettled('width'));
      }
      const [w9, w10, w100, w99, w9Again] = widths;

      expect(w9 < w10 && w10 < w100).toBe(true);
      expect(w100 > w99 && w99 > w9Again).toBe(true);
      expect(w99).toBe(w10, ComparisonMode.PIXEL);
      expect(w9Again).toBe(w9, ComparisonMode.PIXEL);
    });

    test('initial value is rendered before any animation', async () => {
      const progress = makeMutable(100);
      await render(<CounterText progress={progress} />);
      const widthAtHundred = await readSettled('width');

      progress.value = 0;
      const widthAtZero = await readSettled('width');

      expect(widthAtHundred > widthAtZero).toBe(true);
    });

    test('re-render during the animation does not reset the text', async () => {
      const progress = makeMutable(0);
      await render(<CounterText progress={progress} />);
      const widthAtZero = await readSettled('width');

      animateTo(progress, 100);
      await wait(DURATION / 2);
      await render(<CounterText progress={progress} />);
      await waitForNotification(ANIMATION_FINISHED);
      const widthAtEnd = await readSettled('width');

      await render(<CounterText progress={progress} />);
      const widthAfterRerender = await readSettled('width');

      expect(widthAtEnd > widthAtZero).toBe(true);
      expect(widthAfterRerender).toBe(widthAtEnd, ComparisonMode.PIXEL);
    });

    test('swapping the shared value shows and follows the new one', async () => {
      const textA = makeMutable('1');
      const textB = makeMutable('1000');
      await render(<StringText text={textA} />);
      const widthOfA = await readSettled('width');

      await render(<StringText text={textB} />);
      const widthOfB = await readSettled('width');

      textA.value = '10000000';
      const widthAfterOldChanged = await readSettled('width');

      textB.value = '1';
      const widthAfterNewChanged = await readSettled('width');

      expect(widthOfB > widthOfA).toBe(true);
      expect(widthAfterOldChanged).toBe(widthOfB, ComparisonMode.PIXEL);
      expect(widthAfterNewChanged).toBe(widthOfA, ComparisonMode.PIXEL);
    });

    test('null and undefined show empty text', async () => {
      const references = await measureReferences({
        empty: EMPTY_TEXT,
        abc: 'abc',
      });
      const text = makeMutable<string | null | undefined>(null);
      await render(<NullableText text={text} />);
      await expectShows(references, 'empty', 'initial null');

      text.value = 'abc';
      await expectShows(references, 'abc', 'text after null');

      text.value = null;
      await expectShows(references, 'empty', 'null after text');

      text.value = 'abc';
      await expectShows(references, 'abc', 'text after null again');

      text.value = undefined;
      await expectShows(references, 'empty', 'undefined after text');
    });

    test('remounting shows the current value', async () => {
      const progress = makeMutable(0);
      await render(<CounterText key="first" progress={progress} />);
      const widthAtZero = await readSettled('width');

      progress.value = 100;
      const widthAtHundred = await readSettled('width');

      await render(null);
      await render(<CounterText key="second" progress={progress} />);
      const widthAfterRemount = await readSettled('width');

      expect(widthAtHundred > widthAtZero).toBe(true);
      expect(widthAfterRemount).toBe(widthAtHundred, ComparisonMode.PIXEL);
    });
  });

  describe('children switched by a flag', () => {
    test('flag ? numberSv : textSv', async () => {
      const references = await measureReferences({
        '0': '0',
        '100': '100',
        T0: 'T0',
        T100: 'T100',
      });
      const progress = makeMutable(0);
      const show = async (flag: boolean) => {
        await render(<NumberOrTextSv flag={flag} progress={progress} />);
      };

      await show(true);
      await expectShows(references, '0', 'number at 0');
      progress.value = 100;
      await expectShows(references, '100', 'number at 100');
      await show(false);
      await expectShows(references, 'T100', 'switched to text at 100');
      progress.value = 0;
      await expectShows(references, 'T0', 'text at 0');
      await show(true);
      await expectShows(references, '0', 'switched back to number at 0');
      progress.value = 100;
      await expectShows(references, '100', 'number at 100 again');

      await toggleDuringAnimation(
        progress,
        0,
        'DOWN_FINISHED',
        [false, true, false],
        show
      );
      await expectShows(references, 'T0', 'text after toggling in flight');
      await wait(SYNC_BACK_DELAY_MS);
      await show(true);
      await expectShows(references, '0', 'number after sync-back');
      progress.value = 100;
      await expectShows(references, '100', 'number follows after sync-back');
      await show(false);
      await expectShows(references, 'T100', 'text after sync-back');
    });

    for (const [name, empty] of EMPTY_CHILDREN) {
      test(`flag ? numberSv : ${name}`, async () => {
        const references = await measureReferences({
          '0': '0',
          '100': '100',
          empty,
        });
        const progress = makeMutable(0);
        const show = async (flag: boolean) => {
          await render(
            <NumberSvOrEmpty flag={flag} progress={progress} empty={empty} />
          );
        };

        await show(true);
        await expectShows(references, '0', 'number at 0');
        await show(false);
        await expectShows(references, 'empty', 'hidden at 0');
        progress.value = 100;
        await expectShows(references, 'empty', 'stays hidden at 100');
        await show(true);
        await expectShows(references, '100', 'shows the current value');
        await show(false);
        progress.value = 0;
        await show(true);
        await expectShows(references, '0', 'shows the current value again');

        await toggleDuringAnimation(
          progress,
          100,
          'UP_FINISHED',
          [false, true, false],
          show
        );
        await expectShows(references, 'empty', 'hidden after toggling');
        await show(true);
        await expectShows(references, '100', 'shows the end value');
        await wait(SYNC_BACK_DELAY_MS);
        await show(false);
        await expectShows(references, 'empty', 'hidden after sync-back');
        progress.value = 0;
        await show(true);
        await expectShows(references, '0', 'shown after sync-back');
      });
    }

    for (const mixed of [false, true]) {
      const children = mixed ? 'Value: {textSv}%' : '{textSv}';
      test(`animated opacity AND flag ? ${children} : static text`, async () => {
        const text = (value: string) => (mixed ? mixedReference(value) : value);
        const references = await measureReferences({
          '0': text('0'),
          '50': text('50'),
          '100': text('100'),
          [STATIC_TEXT]: STATIC_TEXT,
        });
        const progress = makeMutable(0);
        const show = async (flag: boolean) => {
          await render(
            <FadingTextWithFlag flag={flag} progress={progress} mixed={mixed} />
          );
        };

        await show(true);
        await expectShows(references, '0', 'text animation at 0');
        await expectOpacity(0.2, 'text animation at 0');
        await show(false);
        await expectShows(references, STATIC_TEXT, 'text animation off at 0');
        progress.value = 100;
        await expectShows(references, STATIC_TEXT, 'stays static at 100');
        await expectOpacity(1, 'opacity follows while static');
        await show(true);
        await expectShows(references, '100', 'text animation back at 100');
        await expectOpacity(1, 'text animation back at 100');
        progress.value = 50;
        await expectShows(references, '50', 'both follow to 50');
        await expectOpacity(0.6, 'both follow to 50');

        await toggleDuringAnimation(
          progress,
          0,
          'DOWN_FINISHED',
          [false, true, false, true],
          show
        );
        await expectShows(references, '0', 'after toggling down');
        await expectOpacity(0.2, 'after toggling down');

        await toggleDuringAnimation(
          progress,
          100,
          'UP_FINISHED',
          [false, true, false],
          show
        );
        await expectShows(references, STATIC_TEXT, 'static after toggling up');
        await expectOpacity(1, 'static after toggling up');
        await show(true);
        await expectShows(references, '100', 'text back after toggling up');
        await expectOpacity(1, 'text back after toggling up');

        await wait(SYNC_BACK_DELAY_MS);
        await show(false);
        await expectShows(references, STATIC_TEXT, 'static after sync-back');
        await expectOpacity(1, 'static after sync-back');
        progress.value = 0;
        await expectOpacity(0.2, 'opacity follows after sync-back');
        await show(true);
        await expectShows(references, '0', 'text back after sync-back');
        await expectOpacity(0.2, 'text back after sync-back');
      });
    }

    test('flag ? textSv : Value: {textSv}%', async () => {
      const references = await measureReferences({
        '0': '0',
        '100': '100',
        'Value: 0%': mixedReference('0'),
        'Value: 100%': mixedReference('100'),
      });
      const progress = makeMutable(0);
      const show = async (flag: boolean) => {
        await render(<TextSvOrMixed flag={flag} progress={progress} />);
      };

      await show(true);
      await expectShows(references, '0', 'text at 0');
      progress.value = 100;
      await expectShows(references, '100', 'text at 100');
      await show(false);
      await expectShows(references, 'Value: 100%', 'switched to mixed');
      progress.value = 0;
      await expectShows(references, 'Value: 0%', 'mixed at 0');
      await show(true);
      await expectShows(references, '0', 'switched back to text');
      progress.value = 100;
      await expectShows(references, '100', 'text at 100 again');

      await toggleDuringAnimation(
        progress,
        0,
        'DOWN_FINISHED',
        [false, true, false],
        show
      );
      await expectShows(references, 'Value: 0%', 'mixed after toggling');
      await wait(SYNC_BACK_DELAY_MS);
      await show(true);
      await expectShows(references, '0', 'text after sync-back');
      progress.value = 100;
      await expectShows(references, '100', 'text follows after sync-back');
      await show(false);
      await expectShows(references, 'Value: 100%', 'mixed after sync-back');
    });
  });

  describe('flag changed once before the animation ends', () => {
    test('flag ? numberSv : textSv', async () => {
      const references = await measureReferences({ '0': '0', T100: 'T100' });
      const progress = makeMutable(0);
      const show = async (flag: boolean) => {
        await render(<NumberOrTextSv flag={flag} progress={progress} />);
      };
      await show(true);

      const toText = await switchFlagMidAnimation(
        progress,
        100,
        'UP_FINISHED',
        false,
        show
      );
      expectTextKeepsAnimating(
        'number -> text',
        toText.children,
        /^T\d+$/,
        100
      );
      await expectShows(references, 'T100', 'number -> text, at the end');

      const toNumber = await switchFlagMidAnimation(
        progress,
        0,
        'DOWN_FINISHED',
        true,
        show
      );
      expectTextKeepsAnimating(
        'text -> number',
        toNumber.children,
        NUMBER_FRAME,
        0
      );
      await expectShows(references, '0', 'text -> number, at the end');
    });

    for (const [name, empty] of EMPTY_CHILDREN) {
      test(`flag ? numberSv : ${name}`, async () => {
        const references = await measureReferences({
          '0': '0',
          empty,
        });
        const progress = makeMutable(0);
        const show = async (flag: boolean) => {
          await render(
            <NumberSvOrEmpty flag={flag} progress={progress} empty={empty} />
          );
        };
        await show(true);

        const toEmpty = await switchFlagMidAnimation(
          progress,
          100,
          'UP_FINISHED',
          false,
          show
        );
        expectNoTextUpdates('number -> empty', toEmpty.children);
        await expectShows(references, 'empty', 'number -> empty, at the end');

        const toNumber = await switchFlagMidAnimation(
          progress,
          0,
          'DOWN_FINISHED',
          true,
          show
        );
        expectTextKeepsAnimating(
          'empty -> number',
          toNumber.children,
          NUMBER_FRAME,
          0
        );
        await expectShows(references, '0', 'empty -> number, at the end');
      });
    }

    for (const mixed of [false, true]) {
      const children = mixed ? 'Value: {textSv}%' : '{textSv}';
      test(`animated opacity AND flag ? ${children} : static text`, async () => {
        const references = await measureReferences({
          '0': mixed ? mixedReference('0') : '0',
          [STATIC_TEXT]: STATIC_TEXT,
        });
        const progress = makeMutable(0);
        const show = async (flag: boolean) => {
          await render(
            <FadingTextWithFlag flag={flag} progress={progress} mixed={mixed} />
          );
        };
        await show(true);

        const toStatic = await switchFlagMidAnimation(
          progress,
          100,
          'UP_FINISHED',
          false,
          show
        );
        expectNoTextUpdates('text -> static', toStatic.children);
        expectOpacityKeepsAnimating('text -> static', toStatic.opacity);
        await expectShows(
          references,
          STATIC_TEXT,
          'text -> static, at the end'
        );
        await expectOpacity(1, 'text -> static, at the end');

        const toText = await switchFlagMidAnimation(
          progress,
          0,
          'DOWN_FINISHED',
          true,
          show
        );
        expectTextKeepsAnimating(
          'static -> text',
          toText.children,
          NUMBER_FRAME,
          0
        );
        expectOpacityKeepsAnimating('static -> text', toText.opacity);
        await expectShows(references, '0', 'static -> text, at the end');
        await expectOpacity(0.2, 'static -> text, at the end');
      });
    }

    test('flag ? textSv : Value: {textSv}%', async () => {
      const references = await measureReferences({
        '0': '0',
        'Value: 100%': mixedReference('100'),
      });
      const progress = makeMutable(0);
      const show = async (flag: boolean) => {
        await render(<TextSvOrMixed flag={flag} progress={progress} />);
      };
      await show(true);

      const toMixed = await switchFlagMidAnimation(
        progress,
        100,
        'UP_FINISHED',
        false,
        show
      );
      expectTextKeepsAnimating(
        'text -> mixed',
        toMixed.children,
        NUMBER_FRAME,
        100
      );
      await expectShows(references, 'Value: 100%', 'text -> mixed, at the end');

      const toText = await switchFlagMidAnimation(
        progress,
        0,
        'DOWN_FINISHED',
        true,
        show
      );
      expectTextKeepsAnimating(
        'mixed -> text',
        toText.children,
        NUMBER_FRAME,
        0
      );
      await expectShows(references, '0', 'mixed -> text, at the end');
    });
  });
});

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    alignItems: 'flex-start',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  container: {
    flex: 1,
    alignItems: 'flex-start',
  },
  text: {
    fontSize: 24,
    fontVariant: ['tabular-nums'],
    backgroundColor: 'lightblue',
  },
  italic: {
    fontStyle: 'italic',
    fontVariant: ['tabular-nums'],
  },
  narrow: {
    width: 220,
  },
  box: {
    height: 20,
    backgroundColor: 'royalblue',
  },
  color1: { fontVariant: ['tabular-nums'], backgroundColor: 'coral' },
  color2: { fontVariant: ['tabular-nums'], backgroundColor: 'sandybrown' },
  color3: { fontVariant: ['tabular-nums'], backgroundColor: 'navajowhite' },
  color4: { fontVariant: ['tabular-nums'], backgroundColor: 'khaki' },
  color5: { fontVariant: ['tabular-nums'], backgroundColor: 'lightgreen' },
  color6: {
    fontVariant: ['tabular-nums'],
    backgroundColor: 'mediumaquamarine',
  },
  color7: { fontVariant: ['tabular-nums'], backgroundColor: 'turquoise' },
  color8: { fontVariant: ['tabular-nums'], backgroundColor: 'powderblue' },
});
