import { Component, createContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { disableExitingAnimation } from '../core';
import { findNodeHandle } from 'react-native';

export const SkipEnteringContext =
  createContext<React.MutableRefObject<boolean> | null>(null);

interface LayoutAnimationConfigProps {
  skipEntering?: boolean;
  skipExiting?: boolean;
  children: ReactNode;
}

function SkipEntering(props: { value: boolean; children: ReactNode }) {
  const skipValueRef = useRef(props.value);

  useEffect(() => {
    skipValueRef.current = false;
  }, [skipValueRef]);

  return (
    <SkipEnteringContext.Provider value={skipValueRef}>
      {props.children}
    </SkipEnteringContext.Provider>
  );
}

export class LayoutAnimationConfig extends Component<LayoutAnimationConfigProps> {
  componentDidMount(): void {
    if (this.props.skipExiting) {
      const tag = findNodeHandle(this);
      if (tag) {
        disableExitingAnimation(tag);
      }
    }
  }

  render(): ReactNode {
    if (this.props.skipEntering === undefined) {
      return this.props.children;
    }

    return (
      <SkipEntering value={this.props.skipEntering}>
        {this.props.children}
      </SkipEntering>
    );
  }
}
