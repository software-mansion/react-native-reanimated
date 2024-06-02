/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <hermes/inspector-modern/chrome/MessageInterfaces.h>

#include <memory>
#include <optional>
#include <type_traits>

namespace facebook {
namespace hermes {
namespace inspector_modern {
namespace chrome {
namespace message {

using dynamic = folly::dynamic;

template <typename T>
using optional = std::optional<T>;

template <typename>
struct is_vector : std::false_type {};

template <typename T>
struct is_vector<std::vector<T>> : std::true_type {};

/// valueFromDynamic

template <typename T>
typename std::enable_if<std::is_base_of<Serializable, T>::value, T>::type
valueFromDynamic(const dynamic &obj) {
  return T(obj);
}

template <typename T>
typename std::enable_if<std::is_integral<T>::value, T>::type valueFromDynamic(
    const dynamic &obj) {
  return obj.asInt();
}

template <typename T>
typename std::enable_if<std::is_floating_point<T>::value, T>::type
valueFromDynamic(const dynamic &obj) {
  return obj.asDouble();
}

template <typename T>
typename std::enable_if<std::is_same<T, std::string>::value, T>::type
valueFromDynamic(const dynamic &obj) {
  return obj.asString();
}

template <typename T>
typename std::enable_if<std::is_same<T, dynamic>::value, T>::type
valueFromDynamic(const dynamic &obj) {
  return obj;
}

template <typename T>
typename std::enable_if<is_vector<T>::value, T>::type valueFromDynamic(
    const dynamic &items) {
  T result;
  result.reserve(items.size());
  for (const auto &item : items) {
    result.push_back(valueFromDynamic<typename T::value_type>(item));
  }
  return result;
}

/// assign(lhs, obj, key) is a wrapper for:
///
///   lhs = obj[key]
///
/// It mainly exists so that we can choose the right version of valueFromDynamic
/// based on the type of lhs.

template <typename T, typename U>
void assign(T &lhs, const dynamic &obj, const U &key) {
  lhs = valueFromDynamic<T>(obj.at(key));
}

template <typename T, typename U>
void assign(optional<T> &lhs, const dynamic &obj, const U &key) {
  auto it = obj.find(key);
  if (it != obj.items().end()) {
    lhs = valueFromDynamic<T>(it->second);
  } else {
    lhs.reset();
  }
}

template <typename T, typename U>
void assign(std::unique_ptr<T> &lhs, const dynamic &obj, const U &key) {
  auto it = obj.find(key);
  if (it != obj.items().end()) {
    lhs = std::make_unique<T>(valueFromDynamic<T>(it->second));
  } else {
    lhs.reset();
  }
}

template <typename T, typename U, typename D>
void assign(
    std::unique_ptr<T, std::function<void(D *)>> &lhs,
    const dynamic &obj,
    const U &key) {
  auto it = obj.find(key);
  if (it != obj.items().end()) {
    lhs = std::make_unique<T>(valueFromDynamic<T>(it->second));
  } else {
    lhs.reset();
  }
}

/// valueToDynamic

inline dynamic valueToDynamic(const Serializable &value) {
  return value.toDynamic();
}

template <typename T>
typename std::enable_if<!std::is_base_of<Serializable, T>::value, dynamic>::type
valueToDynamic(const T &item) {
  return dynamic(item);
}

template <typename T>
dynamic valueToDynamic(const std::vector<T> &items) {
  dynamic result = dynamic::array;
  for (const auto &item : items) {
    result.push_back(valueToDynamic(item));
  }
  return result;
}

/// put(obj, key, value) is a wrapper for:
///
///   obj[key] = valueToDynamic(value);

template <typename K, typename V>
void put(dynamic &obj, const K &key, const V &value) {
  obj[key] = valueToDynamic(value);
}

template <typename K, typename V>
void put(dynamic &obj, const K &key, const optional<V> &optValue) {
  if (optValue.has_value()) {
    obj[key] = valueToDynamic(optValue.value());
  } else {
    obj.erase(key);
  }
}

template <typename K, typename V>
void put(dynamic &obj, const K &key, const std::unique_ptr<V> &ptr) {
  if (ptr.get()) {
    obj[key] = valueToDynamic(*ptr);
  } else {
    obj.erase(key);
  }
}

template <typename K, typename V, typename D>
void put(
    dynamic &obj,
    const K &key,
    const std::unique_ptr<V, std::function<void(D *)>> &ptr) {
  if (ptr.get()) {
    obj[key] = valueToDynamic(*ptr);
  } else {
    obj.erase(key);
  }
}

template <typename T>
void deleter(T *p) {
  delete p;
}

} // namespace message
} // namespace chrome
} // namespace inspector_modern
} // namespace hermes
} // namespace facebook
