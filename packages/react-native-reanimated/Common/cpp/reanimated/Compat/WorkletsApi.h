#pragma once

#include <worklets/Compat/StableApi.h>
#include <string>

#define EXPECTED_WORKLETS_STABLE_API_VERSION "0.8.0"

static_assert(
    std::string(WORKLETS_STABLE_API_VERSION) == EXPECTED_WORKLETS_STABLE_API_VERSION,
    "Incompatible worklets stable API version. Expected " EXPECTED_WORKLETS_STABLE_API_VERSION
    ", but got " WORKLETS_STABLE_API_VERSION ".");

#undef EXPECTED_WORKLETS_STABLE_API_VERSION
