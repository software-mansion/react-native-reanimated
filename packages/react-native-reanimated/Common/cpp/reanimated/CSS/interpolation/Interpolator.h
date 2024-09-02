#pragma once

#include <jsi/jsi.h>
#include <memory>

using namespace facebook;

namespace reanimated {

class Interpolator {
 public:
  virtual ~Interpolator() = default;

  virtual jsi::Value update(jsi::Runtime &rt, double progress) = 0;
};

using InterpolatorFactoryFunction = std::function<
    std::shared_ptr<Interpolator>(jsi::Runtime &rt, const jsi::Value &value)>;

} // namespace reanimated
