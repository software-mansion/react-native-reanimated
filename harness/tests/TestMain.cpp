#include <gtest/gtest.h>

#include <algorithm>
#include <iostream>
#include <string>
#include <string_view>
#include <unordered_map>

#include <harness/TestMetadata.h>

namespace reanimated::layout_animation::test {
namespace {

std::string testId(std::string_view suite, std::string_view name) {
  return std::string(suite) + "." + std::string(name);
}

bool validDescription(std::string_view description) {
  const auto sentences = std::count(description.begin(), description.end(), '.');
  return sentences >= 2 && description.find('\t') == std::string_view::npos &&
      description.find('\n') == std::string_view::npos;
}

bool validateMetadata() {
  auto metadataByTest = std::unordered_map<std::string, const TestMetadata *>{};
  auto valid = true;
  for (const auto &entry : registeredTestMetadata()) {
    const auto id = testId(entry.suite, entry.name);
    if (!metadataByTest.emplace(id, &entry.metadata).second) {
      std::cerr << "Duplicate metadata for " << id << '\n';
      valid = false;
    }
    if (!validDescription(entry.metadata.description)) {
      std::cerr << "Description must contain at least two sentences for " << id << '\n';
      valid = false;
    }
  }

  const auto *unitTest = testing::UnitTest::GetInstance();
  for (auto suiteIndex = 0; suiteIndex < unitTest->total_test_suite_count(); ++suiteIndex) {
    const auto *suite = unitTest->GetTestSuite(suiteIndex);
    for (auto testIndex = 0; testIndex < suite->total_test_count(); ++testIndex) {
      const auto *test = suite->GetTestInfo(testIndex);
      const auto id = testId(suite->name(), test->name());
      if (!metadataByTest.erase(id)) {
        std::cerr << "Missing metadata for " << id << '\n';
        valid = false;
      }
    }
  }
  for (const auto &[id, metadata] : metadataByTest) {
    std::cerr << "Metadata has no matching test: " << id << '\n';
    valid = false;
  }
  return valid;
}

void printMetadata() {
  auto entries = registeredTestMetadata();
  std::ranges::sort(entries, {}, [](const auto &entry) { return testId(entry.suite, entry.name); });
  for (const auto &entry : entries) {
    std::cout << entry.suite << '\t' << entry.name << '\t' << entry.metadata.description << '\t';
    for (auto index = size_t{0}; index < entry.metadata.githubIssues.size(); ++index) {
      if (index > 0) {
        std::cout << ',';
      }
      std::cout << entry.metadata.githubIssues[index];
    }
    std::cout << '\n';
  }
}

} // namespace
} // namespace reanimated::layout_animation::test

int main(int argc, char **argv) {
  auto listMetadata = false;
  auto outputIndex = 1;
  for (auto inputIndex = 1; inputIndex < argc; ++inputIndex) {
    if (std::string_view(argv[inputIndex]) == "--harness_list_test_metadata") {
      listMetadata = true;
    } else {
      argv[outputIndex++] = argv[inputIndex];
    }
  }
  argc = outputIndex;

  testing::InitGoogleTest(&argc, argv);
  if (!reanimated::layout_animation::test::validateMetadata()) {
    return 2;
  }
  if (listMetadata) {
    reanimated::layout_animation::test::printMetadata();
    return 0;
  }
  return RUN_ALL_TESTS();
}
