#pragma once

#include <jsi/jsi.h>

typedef struct UISchedulerHandle UISchedulerHandle;

extern std::string workletsStringifyJSIValue(facebook::jsi::Runtime &rt, const facebook::jsi::Value &value);
