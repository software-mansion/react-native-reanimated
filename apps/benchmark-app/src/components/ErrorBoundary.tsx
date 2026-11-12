import type { ReactNode } from 'react';
import { Component } from 'react';
import { Text } from 'react-native';

import { describeError, reportFailed } from '../reporter';

interface Props {
  scenarioName: string;
  children: ReactNode;
}

interface State {
  error?: unknown;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: unknown): State {
    return { error };
  }

  componentDidCatch(error: unknown) {
    reportFailed(this.props.scenarioName, describeError(error));
  }

  render() {
    if ('error' in this.state) {
      return <Text>{describeError(this.state.error)}</Text>;
    }
    return this.props.children;
  }
}
