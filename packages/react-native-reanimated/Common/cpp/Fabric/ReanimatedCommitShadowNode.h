#pragma once
#ifdef RCT_NEW_ARCH_ENABLED

namespace reanimated {

const ShadowNodeTraits::Trait reanimatedCommitTrait{
    ShadowNodeTraits::Trait(1 << 31)};

class ReanimatedCommitShadowNode : public ShadowNode {
 public:
  void setReanimatedCommitTrait() {
    traits_.set(reanimatedCommitTrait);
  }
  void unsetReanimatedCommitTrait() {
    traits_.unset(reanimatedCommitTrait);
  }
  bool isReanimatedCommit() {
    return traits_.check(reanimatedCommitTrait);
  }
};

} // namespace reanimated

#endif // RCT_NEW_ARCH_ENABLED
