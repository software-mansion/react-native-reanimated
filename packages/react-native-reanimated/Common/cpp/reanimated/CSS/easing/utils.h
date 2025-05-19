#pragma once

#include <reanimated/CSS/easing/cubicBezier.h>
#include <reanimated/CSS/easing/linear.h>
#include <reanimated/CSS/easing/steps.h>

#include <jsi/jsi.h>
#include <memory>
#include <string>
#include <unordered_map>
#include <vector>

namespace reanimated::css {

using namespace facebook;

extern const std::unordered_map<std::string, std::shared_ptr<Easing>>
    PREDEFINED_EASING_MAP;

std::shared_ptr<Easing> getPredefinedEasing(const std::string &name);
std::shared_ptr<Easing> createParametrizedEasing(
    jsi::Runtime &rt,
    const jsi::Object &easingConfig);

std::shared_ptr<Easing> createOrGetEasing(
    jsi::Runtime &rt,
    const jsi::Value &easingConfig);

} // namespace reanimated::css
