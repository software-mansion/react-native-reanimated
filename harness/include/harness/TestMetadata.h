#pragma once

#include <cstdint>
#include <string_view>
#include <utility>
#include <vector>

#include <gtest/gtest.h>

namespace reanimated::layout_animation::test {

struct TestMetadata {
  std::string_view description;
  std::vector<uint32_t> githubIssues;
};

struct RegisteredTestMetadata {
  std::string_view suite;
  std::string_view name;
  TestMetadata metadata;
};

inline std::vector<RegisteredTestMetadata> &registeredTestMetadata() {
  static auto metadata = std::vector<RegisteredTestMetadata>{};
  return metadata;
}

class TestMetadataRegistration {
 public:
  TestMetadataRegistration(std::string_view suite, std::string_view name, TestMetadata metadata) {
    registeredTestMetadata().push_back({suite, name, std::move(metadata)});
  }
};

} // namespace reanimated::layout_animation::test

#define HARNESS_TEST(test_suite, test_name, ...) \
  static const ::reanimated::layout_animation::test::TestMetadataRegistration test_suite##_##test_name##_metadata{ \
      #test_suite, #test_name, ::reanimated::layout_animation::test::TestMetadata{__VA_ARGS__}}; \
  TEST(test_suite, test_name)
