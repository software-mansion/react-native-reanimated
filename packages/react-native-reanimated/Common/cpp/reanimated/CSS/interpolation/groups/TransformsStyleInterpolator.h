#pragma once

#include <reanimated/CSS/interpolation/groups/GroupInterpolator.h>

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

class TransformsStyleInterpolator : public GroupInterpolator {
 public:
  TransformsStyleInterpolator(
      jsi::Runtime &rt,
      const jsi::Array &transformsArray,
      const TransformPropertyInterpolatorFactories &factories,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const std::vector<std::string> &propertyPath);

 protected:
  jsi::Value mapInterpolators(
      jsi::Runtime &rt,
      std::function<jsi::Value(Interpolator &)> callback) const override;

 private:
  const TransformPropertyInterpolators interpolators_;

  TransformPropertyInterpolators build(
      jsi::Runtime &rt,
      const jsi::Array &transformsArray,
      const std::shared_ptr<ViewStylesRepository> &viewStylesRepository,
      const TransformPropertyInterpolatorFactories &factories) const;
};

} // namespace reanimated
