#pragma once

#include <folly/dynamic.h>
#include <memory>

namespace facebook::react {

using namespace reanimated;
using namespace css;

class CSSAnimationsManager {
 public:
  CSSAnimationsManager(
      std::shared_ptr<OperationsLoop> operationsLoop,
      std::shared_ptr<ViewStylesRepository> viewStylesRepository);

  ~CSSAnimationsManager();

  folly::dynamic getCurrentFrameProps(const ShadowNode::Shared &shadowNode);

  void update(
      const ReanimatedViewProps &oldProps,
      const ReanimatedViewProps &newProps);

 private:
  std::shared_ptr<OperationsLoop> operationsLoop_;
  std::shared_ptr<ViewStylesRepository> viewStylesRepository_;
};

} // namespace facebook::react
