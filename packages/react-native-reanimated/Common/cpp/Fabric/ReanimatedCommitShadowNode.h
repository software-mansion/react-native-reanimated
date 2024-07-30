#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

namespace reanimated {

constexpr ShadowNodeTraits::Trait reanimatedCommitTrait{1 << 31};

class ReanimatedCommitShadowNode : public ShadowNode {
 public:
  inline void setReanimatedCommitTrait() {
    traits_.set(reanimatedCommitTrait);
  }
  inline void unsetReanimatedCommitTrait() {
    traits_.unset(reanimatedCommitTrait);
  }
  inline bool hasReanimatedCommitTrait() {
    return traits_.check(reanimatedCommitTrait);
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
