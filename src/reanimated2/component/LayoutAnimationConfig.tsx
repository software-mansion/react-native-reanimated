import { Component, createContext, useEffect, useRef } from 'react';
import type { ReactNode } from 'react';
import { disableExitingAnimation } from '../core';
import { findNodeHandle } from 'react-native';

export const LayoutAnimationConfigContext =
  createContext<React.MutableRefObject<{
    skipInitial?: boolean;
  }> | null>(null);

interface LayoutAnimationConfigProps {
  skipInitial?: boolean;
  skipExiting?: boolean;
  children: ReactNode;
}

function SkipEntering(props: { value?: boolean; children: ReactNode }) {
  const skipValueRef = useRef({ skipInitial: !!props.value });

  useEffect(() => {
    skipValueRef.current.skipInitial = false;
  }, [skipValueRef]);

  return (
    <LayoutAnimationConfigContext.Provider value={skipValueRef}>
      {props.children}
    </LayoutAnimationConfigContext.Provider>
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
    return (
      <SkipEntering value={this.props.skipInitial}>
        {this.props.children}
      </SkipEntering>
    );
  }
}
