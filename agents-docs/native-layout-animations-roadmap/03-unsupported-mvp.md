# Objective 03 Unsupported MVP Cases

“Unsupported” means whole-animation legacy fallback, not silent omission or a
rejected public API.

## Deferred by roadmap

| Case | Native routing remains off until | Intended follow-up |
| --- | --- | --- |
| Width/height and content-sensitive size changes | Objective 10 | Prove bounds/FLIP/component policy; fallback per compatibility grid when needed. |
| Ordered transforms, origin, skew, perspective, duplicate operations | Objective 10 | Preserve ordered operations or complete matrices. |
| Full entering/exiting lifecycle, flattening, and reduced-motion semantics | Objective 11 | Enable only after callback and cleanup parity. |
| Structurally unlowerable but deterministic finite graphs | Objective 12 | Error-bounded sampled keyframes. |
| Springs | Objective 13 | Enable the proven subset, including required interruption momentum continuity. |

The current PoC may execute one of these cases. That does not make it
production-MVP eligible.

## Explicit legacy-only cases

- Any unsupported property, value representation, or component target.
- Mixed native/legacy tracks within one logical animation.
- Nonterminating custom layout animations.
- Nested/per-track callbacks until callback events exist in the common plan.
- Unknown custom animation objects, or graphs that read mutable external state,
  use nondeterminism, or perform per-frame side effects.
- Unsafe exiting-child retention under view flattening.
- A spring configuration whose state, stopping rule, clamping, duration, or
  retarget momentum has not passed the Objective 13 corpus.
- Any plan whose compilation exceeds available resources. This is explicit
  fallback, never duration truncation.

## Intentional non-goals

- Presentation-geometry hit testing or accessibility.
- Per-frame Fabric/Yoga layout solely to imitate legacy host-frame updates.
- Implicit composition when two owners claim the same target.
- Changing an active animation when its stored configuration is replaced.
- Inferring a no-op only because start and end values are equal.

## Post-MVP possibility

Configuration storage may precompile a value-independent template—such as
timing shape or capability metadata—to reduce start latency. It must not create
a generation or guess mutation-dependent values. No current objective commits
to this optimization.
