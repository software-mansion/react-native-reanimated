# Post-Objective-09 Evidence

## Result

Objective 09 passes repository checks and iOS compilation. The first focused
Simulator run found a real ownership defect: Scenario 6 used the sampled
compatibility player and bypassed the new registry, so both old and new
callbacks completed with `true`. Sampled playback was then moved onto the same
registry as direct timing plans.

The final post-fix Simulator assertion is intentionally not claimed. During
bounded Argent retries the app returned to iOS Home immediately after the
discovered **Run + interrupt** action, preventing an attributable trace. The
roadmap allows validation to be skipped when the harness blocks progress.

## Implementation checks

- Registry state is main-thread-owned and indexed both by logical handle and
  `(surface, tag, physical target)`.
- Generation is execution identity, not a whole-tag lock.
- Opacity, transform, position, and bounds-size targets coexist when disjoint.
- A same-target replacement captures presentation before removal and uses it as
  the replacement start value.
- Unaffected tracks are transferred under the replacement generation without
  restarting their Core Animation timeline.
- The replaced logical callback terminates exactly once with `finished=false`.
- Direct timing and sampled compatibility playback use the same registry.
- Cancellation and physical-track failure remove only keys recorded under the
  affected handle, with stale delegate callbacks ignored.
- An exact raw CSS key-path collision rejects conservatively. CSS owner review
  of the shared policy remains pending.

## Repository checks

- Full package tests: 94 suites and 1,437 tests passed.
- `common-app type:check:native`: pass.
- `common-app lint`: zero errors; 208 pre-existing warnings.
- `react-native-reanimated lint:apple`: pass.
- `Debug FabricExample` iOS Simulator build: pass.
- `fabric-example type:check` remains blocked by pre-existing missing image
  assets and the existing `LeakCheck` global typing.

## Simulator validation

Simulator: iPhone 17 Pro, iOS 26.1. Scenario 6 was configured for a deterministic
5,000 ms A→B animation and a 2,000 ms (40%) B→C interruption.

Initial run 4 produced two `finished=true` callbacks. Inspection showed that the
scenario's sampled route still installed legacy generation-prefixed keys and
never entered the target registry. The sampled player was refactored to build
generic native tracks and install them through the shared registry.

After rebuilding, repeated bounded post-fix attempts could select the scenario,
set 5,000 ms, verify the computed 2,000 ms interruption, reset, and discover the
button. Activating it immediately returned the app to iOS Home, so no post-fix
trace is attributed to this implementation.

## Validation limits

- No passing post-fix interruption trace is claimed.
- The 0%, 1%, 50%, 99%, and post-completion 20-run matrix was not captured.
- The 100-cycle AddressSanitizer exit/tag-reuse stress and slow video were not
  captured.
- Cross-owner CSS review from Objective 04 remains pending.
