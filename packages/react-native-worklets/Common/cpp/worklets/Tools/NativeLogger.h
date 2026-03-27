#pragma once

#include <functional>
#include <string>

namespace worklets {

using NativeLogger = std::function<void(const std::string &message, unsigned int logLevel)>;

} // namespace worklets
