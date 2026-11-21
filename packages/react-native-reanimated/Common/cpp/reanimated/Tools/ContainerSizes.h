#pragma once

#if !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)

#include <cstddef>
#include <map>
#include <string>
#include <string_view>

namespace reanimated {

/// The number of entries of each container of an owner, by the name of the container.
using ContainerSizes = std::map<std::string, std::size_t>;

/// Adds each size of `part` to the size of the name `<partName>.<name>` in `sizes`.
inline void addContainerSizes(ContainerSizes &sizes, const std::string_view partName, const ContainerSizes &part) {
  for (const auto &[name, size] : part) {
    sizes[std::string(partName) + "." + name] += size;
  }
}

} // namespace reanimated

#endif // !defined(NDEBUG) || defined(REANIMATED_RUNTIME_TEST_HOOKS)
