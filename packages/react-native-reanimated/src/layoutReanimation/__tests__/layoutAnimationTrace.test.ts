'use strict';

// LayoutAnimationTrace start
import type { LayoutAnimationTraceEvent } from '../layoutAnimationTrace';
import {
  LAYOUT_ANIMATION_TRACE_EVENTS,
  LAYOUT_ANIMATION_TRACE_SCENARIOS,
  LAYOUT_ANIMATION_TRACE_SCHEMA_VERSION,
  serializeLayoutAnimationTrace,
} from '../layoutAnimationTrace';

describe('layout animation trace schema', () => {
  test('defines all Objective 01 scenarios', () => {
    expect(LAYOUT_ANIMATION_TRACE_SCENARIOS).toHaveLength(12);
  });

  test('keeps lifecycle event names unique', () => {
    expect(new Set(LAYOUT_ANIMATION_TRACE_EVENTS).size).toBe(
      LAYOUT_ANIMATION_TRACE_EVENTS.length
    );
  });

  test('serializes one event per line', () => {
    const baseEvent: LayoutAnimationTraceEvent = {
      schemaVersion: LAYOUT_ANIMATION_TRACE_SCHEMA_VERSION,
      sequence: 1,
      runId: 7,
      timestampMs: 0,
      backend: 'legacy',
      scenario: 'linear-position',
      source: 'rn-js',
      event: 'scenario-run',
    };
    const events: LayoutAnimationTraceEvent[] = [
      baseEvent,
      {
        ...baseEvent,
        sequence: 2,
        timestampMs: 1.5,
        source: 'fabric',
        event: 'mutation-seen',
        tag: 42,
        surfaceId: 1,
        animationType: 'layout',
        generation: 1,
        mutation: {
          type: 'update',
          oldFrame: { x: 20, y: 20, width: 100, height: 100 },
          newFrame: { x: 200, y: 20, width: 100, height: 100 },
        },
      },
    ];

    const lines = serializeLayoutAnimationTrace(events).split('\n');

    expect(lines).toHaveLength(2);
    expect(JSON.parse(lines[0])).toEqual(events[0]);
    expect(JSON.parse(lines[1])).toEqual(events[1]);
  });
});
// LayoutAnimationTrace end
