import { Children, Component, createContext, useEffect, useRef } from 'react';
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
  componentWillUnmount(): void {
    if (this.props.skipExiting && Children.count(this.props.children) === 1) {
      const tag = findNodeHandle(this);
      if (tag) {
        disableExitingAnimation(tag);
      }
    }
  }

  render(): ReactNode {
    const children =
      Children.count(this.props.children) > 1 && this.props.skipExiting
        ? Children.map(this.props.children, (child) => (
            <LayoutAnimationConfig skipExiting>{child}</LayoutAnimationConfig>
          ))
        : this.props.children;

    if (this.props.skipEntering === undefined) {
      return children;
    }

    return (
      <SkipEntering value={this.props.skipEntering}>{children}</SkipEntering>
    );
  }
}
