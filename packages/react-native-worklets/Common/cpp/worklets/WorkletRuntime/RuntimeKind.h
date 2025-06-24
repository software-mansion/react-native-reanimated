#pragma once

/**
 * @brief Represents the different types of runtime environments available for
 * worklets.
 */
enum class RuntimeKind {
  ReactNative = 1,
  UI = 2,
  Worker = 3,
};
