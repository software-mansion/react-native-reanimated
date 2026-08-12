#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

enum class ResponseKind : uint8_t {
  Text = 0,
  Bytes = 1,
};

enum class RequestError : uint8_t {
  Network = 0,
  Timeout = 1,
  Aborted = 2,
};

struct RequestConfig {
  std::string method;
  std::string url;
  std::vector<std::pair<std::string, std::string>> headers;
  std::optional<std::vector<uint8_t>> body;
  ResponseKind responseKind;
  double timeoutMs;
  bool withCredentials;
};

struct ResponseInfo {
  int status;
  std::string statusText;
  std::vector<std::pair<std::string, std::string>> headers;
  std::string url;
};

} // namespace worklets
