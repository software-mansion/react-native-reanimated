#pragma once

#include <jsi/jsi.h>

#include <functional>

using namespace facebook;

namespace worklets {

struct RuntimeBindings {
  using RequestAnimationFrame = std::function<void(std::function<void(const double)>)>;

  const RequestAnimationFrame requestAnimationFrame;
};

} // namespace worklets
