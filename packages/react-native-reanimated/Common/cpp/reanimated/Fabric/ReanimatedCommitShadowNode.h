#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

namespace reanimated {

// We use this trait to mark that a commit was created by Reanimated.
// Traits are copied when nodes are cloned, so this information
// won't be lost unless someone explicitly overrides it.
// We need this information to skip unnecessary updates in
// the commit hook.
// Currently RN traits go up to 10, so hopefully
// the arbitrarily chosen number 27 will be safe :)
constexpr ShadowNodeTraits::Trait ReanimatedCommitTrait{1 << 27};

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
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
