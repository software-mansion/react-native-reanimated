#pragma once

#ifdef ANDROID
#include <folly/dynamic.h>
#endif

#include <react/renderer/components/rnreanimated/managers/CSSAnimationsManager.h>
#include <react/renderer/components/rnreanimated/managers/CSSTransitionManager.h>

#include <reanimated/CSS/misc/ViewStylesRepository.h>
#include <reanimated/Fabric/operations/OperationsLoop.h>
#include <reanimated/NativeModules/ReanimatedModuleProxy.h>

#include <memory>
#include <optional>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class ReanimatedViewStateData {
 public:
  std::shared_ptr<CSSTransitionManager> cssTransitionManager;
  std::shared_ptr<CSSAnimationsManager> cssAnimationsManager;

  ReanimatedViewStateData();
  ReanimatedViewStateData(const std::shared_ptr<ReanimatedModuleProxy> &proxy);

#ifdef ANDROID
  ReanimatedViewStateData(
      const ReanimatedViewStateData &sourceData,
      folly::dynamic data) {}
  folly::dynamic getDynamic() const {
    return {};
  }
#endif

 private:
  void initialize(const std::shared_ptr<ReanimatedModuleProxy> &proxy);
};

} // namespace facebook::react
