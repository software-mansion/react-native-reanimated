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

struct RelativeOrNumericInterpolatorValue {
  double value;
  bool isRelative;
};

using ColorArray = std::array<uint8_t, 4>;

class Interpolator {
 public:
  virtual ~Interpolator() = default;

  virtual void setFallbackValue(jsi::Runtime &rt, const jsi::Value &value) = 0;

  virtual jsi::Value update(const InterpolationUpdateContext context) = 0;

  virtual jsi::Value reset(const InterpolationUpdateContext context) = 0;
};

using InterpolatorFactoryFunction = std::function<
    std::shared_ptr<Interpolator>(jsi::Runtime &rt, const jsi::Value &value)>;

} // namespace reanimated
