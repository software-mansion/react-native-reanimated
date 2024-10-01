#pragma once

#include <reanimated/CSS/interpolation/Interpolator.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated {

struct TransformPropertyInterpolator {
  std::string property;
  std::shared_ptr<Interpolator> interpolator;

  TransformPropertyInterpolator(
      const std::string &prop,
      std::shared_ptr<Interpolator> interp)
      : property(prop), interpolator(interp) {}
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
      const TransformPropertyInterpolatorFactories &factories,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::vector<std::string> &propertyPath);

  jsi::Value update(const InterpolationUpdateContext context) override;

  jsi::Value reset(const InterpolationUpdateContext context) override;

 private:
  const TransformPropertyInterpolators interpolators_;

  TransformPropertyInterpolators build(
      jsi::Runtime &rt,
      const jsi::Array &transformsArray,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const TransformPropertyInterpolatorFactories &factories) const;
};

} // namespace reanimated
