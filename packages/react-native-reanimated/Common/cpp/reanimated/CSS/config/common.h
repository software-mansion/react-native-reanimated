#pragma once

#include <react/renderer/core/RawValue.h>

#include <reanimated/CSS/easing/utils.h>

#include <jsi/jsi.h>
#include <memory>

namespace reanimated::css {

using namespace facebook::react;

void parseRawValue(
    const RawValue &rawValue,
    std::function<void(jsi::Runtime &, const jsi::Value &)> parser);

double parseDuration(jsi::Runtime &rt, const jsi::Object &config);

std::shared_ptr<Easing> parseTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config);

double parseDelay(jsi::Runtime &rt, const jsi::Object &config);

} // namespace reanimated::css
