#include <reanimated/LayoutAnimations/StaleSynchronousPropsTracker.h>

#include <string>

#ifndef NDEBUG

namespace reanimated {

void StaleSynchronousPropsTracker::record(const Tag tag, const folly::dynamic &props) {
  auto &names = propNames_[tag];
  for (const auto &key : props.keys()) {
    names.insert(key.asString());
  }
}

void StaleSynchronousPropsTracker::forget(const Tag tag) {
  propNames_.erase(tag);
}

void StaleSynchronousPropsTracker::forget(const Tag tag, const folly::dynamic &props) {
  const auto it = propNames_.find(tag);
  if (it == propNames_.end()) {
    return;
  }
  for (const auto &key : props.keys()) {
    it->second.erase(key.asString());
  }
  if (it->second.empty()) {
    propNames_.erase(it);
  }
}

// A layout animation applies the props of the view itself. A shared element transition also
// bakes the transforms of every ancestor into its snapshot.
std::optional<Tag> StaleSynchronousPropsTracker::find(
    const std::shared_ptr<LightNode> &node,
    const LayoutAnimationType type) const {
  if (propNames_.contains(node->current.tag)) {
    return node->current.tag;
  }
  if (type != LayoutAnimationType::SHARED_ELEMENT_TRANSITION) {
    return std::nullopt;
  }
  for (auto ancestor = node->parent.lock(); ancestor; ancestor = ancestor->parent.lock()) {
    const auto it = propNames_.find(ancestor->current.tag);
    if (it != propNames_.end() && it->second.contains("transform")) {
      return ancestor->current.tag;
    }
  }
  return std::nullopt;
}

std::optional<std::string>
StaleSynchronousPropsTracker::takeWarning(const Tag tag, const Tag staleTag, const LayoutAnimationType type) {
  if (!warnedTags_.insert(tag).second) {
    return std::nullopt;
  }
  const auto animationKind =
      type == LayoutAnimationType::SHARED_ELEMENT_TRANSITION ? "shared element transition" : "layout animation";
  const auto reason = staleTag == tag
      ? std::string("with props that were applied through the synchronous path")
      : "under view " + std::to_string(staleTag) + ", whose transform was applied through the synchronous path";
  return "[Reanimated] View " + std::to_string(tag) + " starts a " + animationKind + " " + reason +
      ", so it starts from stale values. Set the TRACK_SYNCHRONOUS_PROPS_IN_LAYOUT_ANIMATIONS dynamic feature flag to notify the reanimated Layout Animation / Shared Transition bookkeeping of the synchronous updates";
}

} // namespace reanimated

#endif // NDEBUG
