#pragma once

#include <jsinspector-modern/HostTarget.h>

/**
 * Worklet Runtimes register with the React Native app's own inspector host
 * when React Native exposes worker runtime targets and the React Native
 * binary in use is built from the same sources as its headers. Prebuilt React
 * Native cores predate the API, so they fall back to the Worklets inspector
 * connection.
 */
#if defined(REACT_NATIVE_INSPECTOR_WORKER_RUNTIMES) && !defined(WORKLETS_RN_PREBUILT_CORE)
#define WORKLETS_RN_WORKER_RUNTIME_TARGETS 1
#endif
