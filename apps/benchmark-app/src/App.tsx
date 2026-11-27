import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';

import { ErrorBoundary } from './components/ErrorBoundary';
import {
  reportFailed,
  reportReady,
  setUncaughtErrorScenario,
} from './reporter';
import type { Scenario } from './scenarios/registry';
import { findScenario, scenarios } from './scenarios/registry';

const WARM_UP_MS = 3000;

export interface LaunchProps {
  scenario?: string;
  load?: number;
}

type Launch =
  | { kind: 'run'; scenario: Scenario; load: number }
  | { kind: 'fail'; scenarioName: string; reason: string };

export function App(props: LaunchProps) {
  const launch = resolveLaunch(props);
  return (
    <SafeAreaProvider>
      <SafeAreaView style={styles.screen}>
        {launch.kind === 'run' ? (
          <ScenarioHost scenario={launch.scenario} load={launch.load} />
        ) : (
          <LaunchFailure
            scenarioName={launch.scenarioName}
            reason={launch.reason}
          />
        )}
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

function resolveLaunch({ scenario: name, load }: LaunchProps): Launch {
  if (name === undefined) {
    return { kind: 'fail', scenarioName: 'none', reason: 'no scenario' };
  }
  const scenario = findScenario(name);
  if (scenario === undefined) {
    return { kind: 'fail', scenarioName: name, reason: 'unknown scenario' };
  }
  if (load !== undefined && !(Number.isInteger(load) && load > 0)) {
    return {
      kind: 'fail',
      scenarioName: name,
      reason: `load ${load} is not a positive integer`,
    };
  }
  const unmetRequirement = scenario.findUnmetRequirement?.();
  if (unmetRequirement !== undefined) {
    return { kind: 'fail', scenarioName: name, reason: unmetRequirement };
  }
  return { kind: 'run', scenario, load: load ?? scenario.load };
}

function ScenarioHost({
  scenario,
  load,
}: {
  scenario: Scenario;
  load: number;
}) {
  useEffect(() => {
    setUncaughtErrorScenario(scenario.name);
    const warmUp = setTimeout(
      () => reportReady(scenario.name, scenario.version, load),
      WARM_UP_MS
    );
    return () => clearTimeout(warmUp);
  }, [scenario, load]);

  return (
    <ErrorBoundary scenarioName={scenario.name}>
      <scenario.Component load={load} />
    </ErrorBoundary>
  );
}

function LaunchFailure({
  scenarioName,
  reason,
}: {
  scenarioName: string;
  reason: string;
}) {
  useEffect(() => {
    reportFailed(scenarioName, reason);
  }, [scenarioName, reason]);

  return (
    <View style={styles.failure}>
      <Text style={styles.title}>{`${reason}: ${scenarioName}`}</Text>
      <Text>Scenarios:</Text>
      {scenarios.map(({ name }) => (
        <Text key={name}>{name}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: 'white',
  },
  failure: {
    padding: 16,
    gap: 4,
  },
  title: {
    fontWeight: 'bold',
  },
});
