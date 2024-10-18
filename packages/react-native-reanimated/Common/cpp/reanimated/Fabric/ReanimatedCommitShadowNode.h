#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

#include <react/renderer/core/ShadowNode.h>

using namespace facebook::react;

namespace reanimated {

// We use this trait to mark that a commit was created by Reanimated.
// Traits are copied when nodes are cloned, so this information
// won't be lost unless someone explicitly overrides it.
// We need this information to skip unnecessary updates in
// the commit hook.
// Currently RN traits go up to 10, so hopefully
// the arbitrarily chosen numbers 27 and 28 will be safe :)

// We have to use 2 traits, because we want to distinguish reanimated
// commits both in the commit hook and mount hook. If we only had one trait
// and didn't remove it in the commit hook, then any node that would clone
// this node would also have our commit trait, rendering this trait useless.
constexpr ShadowNodeTraits::Trait ReanimatedCommitTrait{1 << 27};
constexpr ShadowNodeTraits::Trait ReanimatedMountTrait{1 << 28};

class ReanimatedCommitShadowNode : public ShadowNode {
 public:
  inline void setReanimatedCommitTrait() {
    traits_.set(ReanimatedCommitTrait);
  }
  inline void unsetReanimatedCommitTrait() {
    traits_.unset(ReanimatedCommitTrait);
  }
  inline bool hasReanimatedCommitTrait() {
    return traits_.check(ReanimatedCommitTrait);
  }
  inline void setReanimatedMountTrait() {
    traits_.set(ReanimatedMountTrait);
  }
  inline void unsetReanimatedMountTrait() {
    traits_.unset(ReanimatedMountTrait);
  }
  inline bool hasReanimatedMountTrait() {
    return traits_.check(ReanimatedMountTrait);
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
