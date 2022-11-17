#include "LayoutAnimationsProxy.h"
#include "Shareables.h"

#include <utility>

namespace reanimated {

const long long idOffset = 1e9;

void LayoutAnimationsProxy::configureAnimation(
    int tag,
    const std::string &type,
    std::shared_ptr<Shareable> config) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  if (type == "entering") {
    enteringAnimations_[tag] = config;
  } else if (type == "exiting") {
    exitingAnimations_[tag] = config;
  } else if (type == "layout") {
    layoutAnimations_[tag] = config;
  }
}

bool LayoutAnimationsProxy::hasLayoutAnimation(
    int tag,
    const std::string &type) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  if (type == "entering") {
    return enteringAnimations_.find(tag) != enteringAnimations_.end();
  } else if (type == "exiting") {
    return exitingAnimations_.find(tag) != exitingAnimations_.end();
  } else if (type == "layout") {
    return layoutAnimations_.find(tag) != layoutAnimations_.end();
  }
  return false;
}

void LayoutAnimationsProxy::clearLayoutAnimationConfig(int tag) {
  auto lock = std::unique_lock<std::mutex>(animationsMutex_);
  enteringAnimations_.erase(tag);
  exitingAnimations_.erase(tag);
  layoutAnimations_.erase(tag);
}

void LayoutAnimationsProxy::startLayoutAnimation(
    jsi::Runtime &rt,
    int tag,
    const std::string &type,
    const jsi::Object &values) {
  std::shared_ptr<Shareable> config, viewShareable;
  {
    auto lock = std::unique_lock<std::mutex>(animationsMutex_);
    if (type == "entering") {
      config = enteringAnimations_[tag];
    } else if (type == "exiting") {
      config = exitingAnimations_[tag];
    } else if (type == "layout") {
      config = layoutAnimations_[tag];
    }
  }

  // TODO: cache the following!!
  jsi::Value layoutAnimationRepositoryAsValue =
      rt.global()
          .getPropertyAsObject(rt, "global")
          .getProperty(rt, "LayoutAnimationRepository");
  jsi::Function startAnimationForTag =
      layoutAnimationRepositoryAsValue.getObject(rt).getPropertyAsFunction(
          rt, "startAnimationForTag");
  startAnimationForTag.call(
      rt,
      jsi::Value(tag),
      jsi::String::createFromAscii(rt, type),
      values,
      config->getJSValue(rt));
}

} // namespace reanimated
