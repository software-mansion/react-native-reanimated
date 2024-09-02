#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

#include <worklets/Tools/JSISerializer.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

using namespace worklets;

struct TransformPropertyInterpolator {
  std::string property;
  std::shared_ptr<Interpolator> interpolator;
};

using TransformPropertyInterpolators =
    std::vector<TransformPropertyInterpolator>;
using TransformPropertyInterpolatorFactories =
    std::unordered_map<std::string, InterpolatorFactoryFunction>;

class TransformsStyleInterpolator : public Interpolator {
 public:
  TransformsStyleInterpolator(
      jsi::Runtime &rt,
      const jsi::Array &transformsArray,
      const TransformPropertyInterpolatorFactories &factories);

  jsi::Value update(const InterpolationUpdateContext context) override;

 private:
  const TransformPropertyInterpolators interpolators_;

  TransformPropertyInterpolators build(
      jsi::Runtime &rt,
      const jsi::Array &transformsArray,
      const TransformPropertyInterpolatorFactories &factories) const;
};

} // namespace reanimated
