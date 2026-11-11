#pragma once

// IWYU pragma: begin_keep

// C++ standard library
#include <algorithm>
#include <atomic>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <ostream>
#include <string>
#include <string_view>
#include <type_traits>
#include <unordered_map>
#include <unordered_set>
#include <utility>
#include <vector>

// fbjni
#include <fbjni/fbjni.h>

// folly
#include <folly/Conv.h>
#include <folly/Expected.h>
#include <folly/Format.h>
#include <folly/dynamic.h>
#include <folly/json/dynamic.h>

// jsi
#include <jsi/JSIDynamic.h>
#include <jsi/jsi.h>

// react-native renderer (Fabric)
#include <react/renderer/components/root/RootProps.h>
#include <react/renderer/components/root/RootShadowNode.h>
#include <reanimated/Compat/ReactNativeView.h>
#include <reanimated/Compat/ReactNativeRendererCore.h>
#include <react/renderer/mounting/ShadowTree.h>
#include <react/renderer/uimanager/UIManager.h>

// IWYU pragma: end_keep
