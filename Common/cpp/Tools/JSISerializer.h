#pragma once

#include <jsi/jsi.h>
#include <string>

using namespace facebook;

std::string stringifyJSIValue(jsi::Runtime &rt, const jsi::Value &value);
