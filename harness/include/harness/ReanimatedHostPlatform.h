#pragma once

#if !defined(ANDROID) && !defined(__APPLE__)
#include <folly/dynamic.h>

#include <functional>

namespace reanimated {

using SynchronouslyUpdateUIPropsFunction = std::function<void(int, const folly::dynamic &)>;

} // namespace reanimated
#endif
