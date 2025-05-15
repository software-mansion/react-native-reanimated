#pragma once

#include <reanimated/CSS/easing/utils.h>

#include <jsi/jsi.h>

namespace reanimated::css {

double parseDuration(jsi::Runtime &rt, const jsi::Object &config);

std::shared_ptr<Easing> parseTimingFunction(
    jsi::Runtime &rt,
    const jsi::Object &config);

double parseDelay(jsi::Runtime &rt, const jsi::Object &config);

} // namespace reanimated::css
