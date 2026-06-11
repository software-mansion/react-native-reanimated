#pragma once

#include <jsi/jsi.h>
#include <react/renderer/core/ReactPrimitives.h>
#include <react/renderer/mounting/ShadowView.h>
#include <react/renderer/mounting/ShadowViewMutation.h>

#include <atomic>
#include <cstdint>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

using namespace facebook;
using namespace react;

/**
 * Records the prop updates Reanimated sends to the platform mounting layer.
 *
 * This is a testing-only utility used by the ReJest runtime testing framework
 * to capture the *native* values of an animation (as opposed to the values
 * computed in JS). On the new architecture, animated props reach the platform
 * as `ShadowViewMutation`s pulled through the layout-animations
 * `MountingOverrideDelegate` (`pullTransaction`). This registry listens to that
 * same stream, so it observes exactly what is mounted - regardless of whether
 * the value came from an animated style, a layout animation, a shared element
 * transition or a CSS animation.
 *
 * iOS Core Animation routes some properties (e.g. opacity transitions) straight
 * to the `CALayer` and therefore emits no per-frame mutation. For those, the
 * animation *descriptor* (from/to/duration) is recorded separately via
 * `recordCoreAnimationDescriptor`.
 *
 * All recording is gated behind the `RUNTIME_TEST_FLAG` static feature flag at
 * the call sites, so this class is never exercised in production builds.
 *
 * Thread-safety: `record` runs on the mounting thread (`pullTransaction`),
 * while the read methods run on the UI runtime thread. The registry owns an
 * independent mutex and must never call back into the proxy / registry manager
 * to avoid lock-ordering issues with the commit-pause mutex.
 */
class NativeMutationsRegistry {
 public:
  // Recording lifecycle (called from the UI runtime thread).
  void start();
  void stop();
  void clear();
  bool isRecording() const;

  // Called from `pullTransaction` (mounting thread). No `jsi::Runtime` access.
  void record(const ShadowViewMutationList &mutations);

  // Called from the iOS Core Animation hook (any thread). No `jsi::Runtime`.
  void recordCoreAnimationDescriptor(
      Tag tag,
      const std::string &propName,
      double fromValue,
      double toValue,
      double durationMs);

  // Returns the most recently recorded value of `propName` for `tag`, or an
  // empty string when nothing was recorded for that tag yet. Mirrors the string
  // contract of `obtainProp`. Reads from the props/layout actually sent to the
  // platform.
  std::string obtainLatestProp(jsi::Runtime &rt, Tag tag, const std::string &propName) const;

  // Full dump of everything recorded during the current session, as an array of
  // `{ tag, index, snapshot? , descriptor? }` objects. `snapshot` holds the
  // recorded values of the ReJest-valid props; `descriptor` holds a recorded
  // Core Animation descriptor.
  jsi::Value getRecordedMutations(jsi::Runtime &rt) const;

 private:
  struct MutationEntry {
    Tag tag;
    uint64_t index;
    ShadowView view;
  };

  struct DescriptorEntry {
    Tag tag;
    uint64_t index;
    std::string propName;
    double fromValue;
    double toValue;
    double durationMs;
  };

  mutable std::mutex mutex_;
  std::atomic<bool> recording_{false};
  uint64_t index_{0};

  std::vector<MutationEntry> mutationLog_;
  std::vector<DescriptorEntry> descriptorLog_;
  std::unordered_map<Tag, ShadowView> latestViewForTag_;
};

} // namespace reanimated
