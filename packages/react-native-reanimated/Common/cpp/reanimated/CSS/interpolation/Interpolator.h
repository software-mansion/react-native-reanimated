#pragma once

#include <react/renderer/core/ShadowNode.h>

#include <jsi/jsi.h>
#include <memory>

namespace reanimated {

using namespace facebook;
using namespace react;

struct InterpolationUpdateContext {
  jsi::Runtime &rt;
  ShadowNode::Shared node;
  double progress;
  std::optional<double> previousProgress;
  bool directionChanged;
};

struct RelativeInterpolatorValue {
  double value;
  bool isRelative;
};

class Interpolator {
 public:
  virtual ~Interpolator() = default;

  virtual jsi::Value update(const InterpolationUpdateContext context) = 0;
};

using InterpolatorFactoryFunction = std::function<
    std::shared_ptr<Interpolator>(jsi::Runtime &rt, const jsi::Value &value)>;

} // namespace reanimated
