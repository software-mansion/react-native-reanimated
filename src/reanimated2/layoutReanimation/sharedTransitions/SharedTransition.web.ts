'use strict';
import { ReduceMotion } from '../../commonTypes';

export class SharedTransition {
  public custom(): SharedTransition {
    return this;
  }

  public progressAnimation(): SharedTransition {
    return this;
  }

  public duration(): SharedTransition {
    return this;
  }

  public reduceMotion(): this {
    return this;
  }

  public defaultTransitionType(): SharedTransition {
    return this;
  }

  public registerTransition(): void {
    // no-op
  }

  public unregisterTransition(): void {
    // no-op
  }

  public getReduceMotion(): ReduceMotion {
    return ReduceMotion.System;
  }

  // static builder methods

  public static custom(): SharedTransition {
    return new SharedTransition();
  }

  public static duration(): SharedTransition {
    return new SharedTransition();
  }

  public static progressAnimation(): SharedTransition {
    return new SharedTransition();
  }

  public static defaultTransitionType(): SharedTransition {
    return new SharedTransition();
  }

  public static reduceMotion(): SharedTransition {
    return new SharedTransition();
  }
}
