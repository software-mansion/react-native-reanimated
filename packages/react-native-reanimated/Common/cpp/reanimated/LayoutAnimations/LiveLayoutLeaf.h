#pragma once

#include <cstdint>
#include <string>
#include <vector>

namespace reanimated {

/// A leaf of a layout animation build whose native track plays on a view.
struct LiveLayoutLeaf {
  uint64_t buildId;
  std::string key;
};

using LiveLayoutLeaves = std::vector<LiveLayoutLeaf>;

} // namespace reanimated
