// LayoutAnimationTrace start

import Clipboard from '@react-native-clipboard/clipboard';
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { ScenarioRenderer } from './scenarios';
import {
  countLayoutAnimationTraceEvents,
  countRejectedPlatformStarts,
  getCompiledLayoutAnimationBackend,
  getReducedMotionEnabled,
  readLayoutAnimationTrace,
  recordLayoutAnimationTraceEvent,
  setNativeLayoutAnimationStartPaused,
  startLayoutAnimationTrace,
  stopLayoutAnimationTrace,
} from './trace';
import {
  DEFAULT_DURATION_MS,
  DEFAULT_REPETITIONS,
  INTERRUPT_AT_MS,
  RESET_SETTLE_MS,
  scenarioHasRunEnd,
  TEST_BENCH_SCENARIOS,
} from './types';
import type {
  TestBenchMode,
  TestBenchPhase,
  TestBenchScenarioId,
} from './types';

type Timer = ReturnType<typeof setTimeout>;
type RunStatus = 'idle' | 'running' | 'pass' | 'fail';

function clampInteger(
  value: string,
  fallback: number,
  min: number,
  max: number
) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(parsed)));
}

function cycleDurationMs(
  mode: TestBenchMode,
  scenario: TestBenchScenarioId,
  durationMs: number
) {
  if (mode === 'interrupt') {
    return RESET_SETTLE_MS + INTERRUPT_AT_MS + durationMs + 300;
  }
  if (mode === 'cancel') {
    return RESET_SETTLE_MS + durationMs + 300;
  }
  if (scenarioHasRunEnd(scenario)) {
    return RESET_SETTLE_MS + durationMs * 2 + 420;
  }
  return RESET_SETTLE_MS + durationMs + 300;
}

interface ControlButtonProps {
  disabled?: boolean;
  label: string;
  onPress: () => void;
  secondary?: boolean;
}

function ControlButton({
  disabled,
  label,
  onPress,
  secondary,
}: ControlButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.controlButton,
        secondary && styles.secondaryButton,
        pressed && !disabled && styles.pressedButton,
        disabled && styles.disabledButton,
      ]}>
      <Text
        style={[
          styles.controlButtonText,
          secondary && styles.secondaryButtonText,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export default function NativeLayoutAnimationsTestBench() {
  const [scenario, setScenario] = useState<TestBenchScenarioId>(
    TEST_BENCH_SCENARIOS[0].id
  );
  const [durationInput, setDurationInput] = useState(
    String(DEFAULT_DURATION_MS)
  );
  const [repetitionsInput, setRepetitionsInput] = useState(
    String(DEFAULT_REPETITIONS)
  );
  const [phase, setPhase] = useState<TestBenchPhase>('reset');
  const [activeMode, setActiveMode] = useState<TestBenchMode | null>(null);
  const [callbackCount, setCallbackCount] = useState(0);
  const [lastFinished, setLastFinished] = useState<boolean | null>(null);
  const [status, setStatus] = useState<RunStatus>('idle');
  const [statusMessage, setStatusMessage] = useState(
    'Press Reset, then choose an action.'
  );
  const [trace, setTrace] = useState('');
  const [traceAvailable, setTraceAvailable] = useState(false);
  const [runId, setRunId] = useState(0);

  const timersRef = useRef<Timer[]>([]);
  const runIdRef = useRef(0);
  const callbackCountRef = useRef(0);
  const lastFinishedRef = useRef<boolean | null>(null);
  const nativeStartGateActiveRef = useRef(false);

  const durationMs = clampInteger(
    durationInput,
    DEFAULT_DURATION_MS,
    100,
    5000
  );
  const repetitions = clampInteger(
    repetitionsInput,
    DEFAULT_REPETITIONS,
    1,
    10
  );
  const backend = getCompiledLayoutAnimationBackend();
  const selectedScenario = useMemo(
    () => TEST_BENCH_SCENARIOS.find((item) => item.id === scenario)!,
    [scenario]
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const schedule = useCallback((action: () => void, delayMs: number) => {
    timersRef.current.push(setTimeout(action, delayMs));
  }, []);

  const refreshTrace = useCallback(() => {
    setTrace(readLayoutAnimationTrace());
  }, []);

  const reset = useCallback(async () => {
    clearTimers();
    nativeStartGateActiveRef.current = false;
    setNativeLayoutAnimationStartPaused(false);
    stopLayoutAnimationTrace();
    callbackCountRef.current = 0;
    lastFinishedRef.current = null;
    setCallbackCount(0);
    setLastFinished(null);
    setStatus('idle');
    setActiveMode(null);
    setStatusMessage(
      'Ready. Choose one deterministic run mode; Interrupt fires at 240 ms.'
    );
    setPhase('reset');

    const reducedMotion = await getReducedMotionEnabled();
    const nextRunId = runIdRef.current + 1;
    runIdRef.current = nextRunId;
    setRunId(nextRunId);
    const available = startLayoutAnimationTrace(
      nextRunId,
      scenario,
      reducedMotion
    );
    setTraceAvailable(available);
    recordLayoutAnimationTraceEvent('scenario-reset');
    refreshTrace();
  }, [clearTimers, refreshTrace, scenario]);

  useEffect(() => {
    reset().catch(console.error);
    return () => {
      clearTimers();
      nativeStartGateActiveRef.current = false;
      setNativeLayoutAnimationStartPaused(false);
      stopLayoutAnimationTrace();
    };
  }, [clearTimers, reset]);

  useEffect(() => {
    if (status !== 'running') {
      return;
    }
    const interval = setInterval(refreshTrace, 200);
    return () => clearInterval(interval);
  }, [refreshTrace, status]);

  const onAnimationCallback = useCallback(
    (finished: boolean) => {
      const count = callbackCountRef.current + 1;
      callbackCountRef.current = count;
      lastFinishedRef.current = finished;
      setCallbackCount(count);
      setLastFinished(finished);
      recordLayoutAnimationTraceEvent('callback-invoked', finished, count);
      if (nativeStartGateActiveRef.current) {
        nativeStartGateActiveRef.current = false;
        setNativeLayoutAnimationStartPaused(false);
      }
      refreshTrace();
    },
    [refreshTrace]
  );

  const execute = useCallback(
    (mode: TestBenchMode) => {
      clearTimers();
      callbackCountRef.current = 0;
      lastFinishedRef.current = null;
      setCallbackCount(0);
      setLastFinished(null);
      setStatus('running');
      setActiveMode(mode);
      setStatusMessage(
        `${mode.toUpperCase()} · ${repetitions} deterministic repetition${
          repetitions === 1 ? '' : 's'
        }`
      );

      const oneCycleMs = cycleDurationMs(mode, scenario, durationMs);
      for (let repetition = 0; repetition < repetitions; repetition++) {
        const cycleStart = repetition * oneCycleMs;
        schedule(() => {
          if (
            backend === 'native' &&
            scenario === 'cancel-before-platform-start' &&
            mode === 'cancel'
          ) {
            nativeStartGateActiveRef.current = true;
            setNativeLayoutAnimationStartPaused(true);
          }
          setPhase('reset');
          if (repetition > 0) {
            recordLayoutAnimationTraceEvent('scenario-reset');
          }
        }, cycleStart);

        schedule(() => {
          setPhase('run');
          recordLayoutAnimationTraceEvent('scenario-run');
        }, cycleStart + RESET_SETTLE_MS);

        if (mode === 'interrupt') {
          schedule(
            () => {
              setPhase('interrupt');
              recordLayoutAnimationTraceEvent('scenario-interrupt');
            },
            cycleStart + RESET_SETTLE_MS + INTERRUPT_AT_MS
          );
        } else if (mode === 'cancel') {
          schedule(
            () => {
              setPhase('cancel');
              recordLayoutAnimationTraceEvent('scenario-cancel');
            },
            cycleStart + RESET_SETTLE_MS + 1
          );
        } else if (scenarioHasRunEnd(scenario)) {
          schedule(
            () => {
              setPhase('run-end');
            },
            cycleStart + RESET_SETTLE_MS + durationMs + 120
          );
        }
      }

      schedule(() => {
        const count = callbackCountRef.current;
        const finished = lastFinishedRef.current;
        const isCancelBeforePlatformStart =
          scenario === 'cancel-before-platform-start' && mode === 'cancel';
        const cancellationResultIsExpected =
          !isCancelBeforePlatformStart || finished === false;
        const callbackCountIsExpected = isCancelBeforePlatformStart
          ? count === repetitions
          : count >= repetitions;
        const platformStartCount =
          countLayoutAnimationTraceEvents('platform-started');
        const platformStartCountIsExpected =
          !isCancelBeforePlatformStart || platformStartCount === 0;
        const rejectedPlatformStartCount = countRejectedPlatformStarts();
        const rejectedPlatformStartCountIsExpected =
          !isCancelBeforePlatformStart ||
          backend !== 'native' ||
          rejectedPlatformStartCount === repetitions;
        const passed =
          callbackCountIsExpected &&
          finished !== null &&
          cancellationResultIsExpected &&
          platformStartCountIsExpected &&
          rejectedPlatformStartCountIsExpected;
        recordLayoutAnimationTraceEvent('animation-settled', finished, count);
        setStatus(passed ? 'pass' : 'fail');
        setStatusMessage(
          passed
            ? `PASS · observed ${count} callback${count === 1 ? '' : 's'}`
            : `FAIL · callbacks=${count}, last finished=${String(
                finished
              )}, platform starts=${platformStartCount}, rejected starts=${rejectedPlatformStartCount}`
        );
        refreshTrace();
      }, repetitions * oneCycleMs);
    },
    [
      backend,
      clearTimers,
      durationMs,
      refreshTrace,
      repetitions,
      scenario,
      schedule,
    ]
  );

  const copyTrace = useCallback(() => {
    const currentTrace = readLayoutAnimationTrace();
    Clipboard.setString(currentTrace);
    setTrace(currentTrace);
  }, []);

  return (
    <ScrollView
      contentContainerStyle={styles.content}
      keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>Native layout-animation test bench</Text>
      <View style={styles.backendRow}>
        <Text style={styles.backendLabel}>COMPILED BACKEND</Text>
        <Text
          style={[
            styles.backendValue,
            backend === 'native' ? styles.nativeBackend : styles.legacyBackend,
          ]}>
          {backend.toUpperCase()}
        </Text>
        <Text style={styles.runId}>run {runId}</Text>
      </View>

      <Text style={styles.sectionTitle}>Scenario</Text>
      <View style={styles.scenarioGrid}>
        {TEST_BENCH_SCENARIOS.map((item) => (
          <Pressable
            accessibilityRole="button"
            disabled={status === 'running'}
            key={item.id}
            onPress={() => setScenario(item.id)}
            style={[
              styles.scenarioButton,
              item.id === scenario && styles.selectedScenarioButton,
              status === 'running' && styles.disabledButton,
            ]}>
            <Text
              style={[
                styles.scenarioButtonText,
                item.id === scenario && styles.selectedScenarioButtonText,
              ]}>
              {item.title}
            </Text>
          </Pressable>
        ))}
      </View>
      <Text style={styles.description}>{selectedScenario.description}</Text>

      <View style={styles.fieldsRow}>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Duration (ms)</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setDurationInput}
            style={styles.input}
            value={durationInput}
          />
        </View>
        <View style={styles.field}>
          <Text style={styles.fieldLabel}>Repetitions (1–10)</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setRepetitionsInput}
            style={styles.input}
            value={repetitionsInput}
          />
        </View>
      </View>
      <Text style={styles.timingNote}>
        Interrupt offset: {INTERRUPT_AT_MS} ms · Cancel offset: next JS task
      </Text>

      <View style={styles.controls}>
        <ControlButton
          disabled={status === 'running'}
          label="Reset"
          onPress={() => {
            reset().catch(console.error);
          }}
          secondary
        />
        <ControlButton
          disabled={status === 'running'}
          label="Run uninterrupted"
          onPress={() => execute('run')}
        />
        <ControlButton
          disabled={status === 'running'}
          label="Run + interrupt"
          onPress={() => execute('interrupt')}
        />
        <ControlButton
          disabled={status === 'running'}
          label="Run + cancel"
          onPress={() => execute('cancel')}
        />
      </View>

      <View style={styles.stageCard}>
        <ScenarioRenderer
          durationMs={durationMs}
          mode={activeMode}
          onAnimationCallback={onAnimationCallback}
          phase={phase}
          scenario={scenario}
        />
      </View>

      <View
        style={[
          styles.statusCard,
          status === 'pass' && styles.passCard,
          status === 'fail' && styles.failCard,
        ]}>
        <Text style={styles.statusText}>{statusMessage}</Text>
        <Text style={styles.callbackText}>
          callback count: {callbackCount} · last finished:{' '}
          {lastFinished === null ? '—' : String(lastFinished)}
        </Text>
        {!traceAvailable && (
          <Text style={styles.traceWarning}>
            Native trace controls are unavailable. Use a Debug build.
          </Text>
        )}
      </View>

      <View style={styles.traceHeader}>
        <Text style={styles.sectionTitle}>Structured trace (JSONL)</Text>
        <ControlButton label="Copy trace" onPress={copyTrace} secondary />
      </View>
      <ScrollView horizontal style={styles.traceBox}>
        <Text selectable style={styles.traceText}>
          {trace || 'No trace events yet.'}
        </Text>
      </ScrollView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 12,
    padding: 16,
    paddingBottom: 80,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '800',
  },
  backendRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  backendLabel: {
    color: '#6b7280',
    fontSize: 11,
    fontWeight: '700',
  },
  backendValue: {
    borderRadius: 6,
    color: 'white',
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  legacyBackend: {
    backgroundColor: '#2563eb',
  },
  nativeBackend: {
    backgroundColor: '#7c3aed',
  },
  runId: {
    color: '#6b7280',
    marginLeft: 'auto',
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '700',
  },
  scenarioGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  scenarioButton: {
    backgroundColor: '#f3f4f6',
    borderColor: '#d1d5db',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 9,
    paddingVertical: 7,
  },
  selectedScenarioButton: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  scenarioButtonText: {
    color: '#374151',
    fontSize: 12,
  },
  selectedScenarioButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  description: {
    color: '#4b5563',
    lineHeight: 20,
  },
  fieldsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  field: {
    flex: 1,
    gap: 5,
  },
  fieldLabel: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '600',
  },
  input: {
    borderColor: '#9ca3af',
    borderRadius: 8,
    borderWidth: 1,
    color: '#111827',
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  timingNote: {
    color: '#6b7280',
    fontSize: 12,
  },
  controls: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  controlButton: {
    backgroundColor: '#111827',
    borderColor: '#111827',
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 13,
    paddingVertical: 9,
  },
  secondaryButton: {
    backgroundColor: 'white',
    borderColor: '#9ca3af',
  },
  pressedButton: {
    opacity: 0.65,
  },
  disabledButton: {
    opacity: 0.45,
  },
  controlButtonText: {
    color: 'white',
    fontWeight: '700',
  },
  secondaryButtonText: {
    color: '#111827',
  },
  stageCard: {
    backgroundColor: '#f9fafb',
    borderColor: '#d1d5db',
    borderRadius: 12,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: 8,
  },
  statusCard: {
    backgroundColor: '#f3f4f6',
    borderRadius: 10,
    gap: 4,
    padding: 12,
  },
  passCard: {
    backgroundColor: '#dcfce7',
  },
  failCard: {
    backgroundColor: '#fee2e2',
  },
  statusText: {
    color: '#111827',
    fontWeight: '700',
  },
  callbackText: {
    color: '#374151',
  },
  traceWarning: {
    color: '#b45309',
    fontSize: 12,
  },
  traceHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  traceBox: {
    backgroundColor: '#111827',
    borderRadius: 8,
    maxHeight: 360,
    padding: 10,
  },
  traceText: {
    color: '#d1fae5',
    fontFamily: 'Courier',
    fontSize: 10,
    lineHeight: 15,
  },
});

// LayoutAnimationTrace end
