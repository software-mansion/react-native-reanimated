#pragma once

#include <cstdint>
#include <optional>
#include <string>
#include <utility>
#include <vector>

namespace worklets {

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
  double timeoutMs;
  bool withCredentials;
};

struct ResponseInfo {
  int status;
  std::string statusText;
  std::vector<std::pair<std::string, std::string>> headers;
  std::string url;
};

struct WebSocketConfig {
  std::string url;
  std::vector<std::string> protocols;
  std::vector<std::pair<std::string, std::string>> headers;
};

/**
 * https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1 - 1005 and 1006 are
 * reserved for a close that carried no code and an abnormal close.
 */
enum class WebSocketCloseCode : uint16_t {
  NoStatusReceived = 1005,
  AbnormalClosure = 1006,
};

} // namespace worklets
