/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#include "JSLogging.h"

#include <fb/log.h>

namespace facebook::react {

void reactAndroidLoggingHook(
    const std::string& message,
    android_LogPriority logLevel) {
  FBLOG_PRI(logLevel, "ReactNativeJS", "%s", message.c_str());
}

void reactAndroidLoggingHook(
    const std::string& message,
    unsigned int logLevel) {
  reactAndroidLoggingHook(
      message, static_cast<android_LogPriority>(logLevel + ANDROID_LOG_DEBUG));
}

} // namespace facebook::react
