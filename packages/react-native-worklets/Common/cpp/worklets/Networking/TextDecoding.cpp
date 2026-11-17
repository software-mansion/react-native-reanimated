#include <worklets/Networking/TextDecoding.h>

#include <algorithm>
#include <cctype>

namespace worklets::text {

namespace {

constexpr uint32_t kReplacementCodePoint = 0xFFFD;

// Code points for bytes 0x80-0x9F, where windows-1252 differs from Latin-1.
constexpr uint16_t kWindows1252CodePoints[32] = {0x20AC, 0x0081, 0x201A, 0x0192, 0x201E, 0x2026, 0x2020, 0x2021,
                                                 0x02C6, 0x2030, 0x0160, 0x2039, 0x0152, 0x008D, 0x017D, 0x008F,
                                                 0x0090, 0x2018, 0x2019, 0x201C, 0x201D, 0x2022, 0x2013, 0x2014,
                                                 0x02DC, 0x2122, 0x0161, 0x203A, 0x0153, 0x009D, 0x017E, 0x0178};

void appendUtf8(std::string &result, const uint32_t codePoint) {
  if (codePoint < 0x80) {
    result.push_back(static_cast<char>(codePoint));
  } else if (codePoint < 0x800) {
    result.push_back(static_cast<char>(0xC0 | (codePoint >> 6)));
    result.push_back(static_cast<char>(0x80 | (codePoint & 0x3F)));
  } else if (codePoint < 0x10000) {
    result.push_back(static_cast<char>(0xE0 | (codePoint >> 12)));
    result.push_back(static_cast<char>(0x80 | ((codePoint >> 6) & 0x3F)));
    result.push_back(static_cast<char>(0x80 | (codePoint & 0x3F)));
  } else {
    result.push_back(static_cast<char>(0xF0 | (codePoint >> 18)));
    result.push_back(static_cast<char>(0x80 | ((codePoint >> 12) & 0x3F)));
    result.push_back(static_cast<char>(0x80 | ((codePoint >> 6) & 0x3F)));
    result.push_back(static_cast<char>(0x80 | (codePoint & 0x3F)));
  }
}

std::string decodeWindows1252Impl(const uint8_t *data, const size_t size) {
  std::string result;
  result.reserve(size);
  for (size_t i = 0; i < size; i++) {
    const auto byte = data[i];
    if (byte >= 0x80 && byte < 0xA0) {
      appendUtf8(result, kWindows1252CodePoints[byte - 0x80]);
    } else {
      appendUtf8(result, byte);
    }
  }
  return result;
}

// The WHATWG Encoding Standard UTF-8 decoder, emitting U+FFFD for malformed
// sequences. `jsi::String::createFromUtf8` has undefined behavior for invalid
// UTF-8, so every byte sequence must pass through here first.
std::string decodeUtf8Impl(const uint8_t *data, const size_t size) {
  std::string result;
  result.reserve(size);
  uint32_t codePoint = 0;
  int bytesNeeded = 0;
  int bytesSeen = 0;
  uint8_t lowerBoundary = 0x80;
  uint8_t upperBoundary = 0xBF;
  size_t index = 0;
  while (index < size) {
    const auto byte = data[index];
    if (bytesNeeded == 0) {
      index++;
      if (byte <= 0x7F) {
        result.push_back(static_cast<char>(byte));
      } else if (byte >= 0xC2 && byte <= 0xDF) {
        bytesNeeded = 1;
        codePoint = byte & 0x1FU;
      } else if (byte >= 0xE0 && byte <= 0xEF) {
        lowerBoundary = byte == 0xE0 ? 0xA0 : 0x80;
        upperBoundary = byte == 0xED ? 0x9F : 0xBF;
        bytesNeeded = 2;
        codePoint = byte & 0x0FU;
      } else if (byte >= 0xF0 && byte <= 0xF4) {
        lowerBoundary = byte == 0xF0 ? 0x90 : 0x80;
        upperBoundary = byte == 0xF4 ? 0x8F : 0xBF;
        bytesNeeded = 3;
        codePoint = byte & 0x07U;
      } else {
        appendUtf8(result, kReplacementCodePoint);
      }
      continue;
    }
    if (byte < lowerBoundary || byte > upperBoundary) {
      codePoint = 0;
      bytesNeeded = 0;
      bytesSeen = 0;
      lowerBoundary = 0x80;
      upperBoundary = 0xBF;
      appendUtf8(result, kReplacementCodePoint);
      continue;
    }
    lowerBoundary = 0x80;
    upperBoundary = 0xBF;
    codePoint = (codePoint << 6U) | (byte & 0x3FU);
    bytesSeen++;
    index++;
    if (bytesSeen == bytesNeeded) {
      appendUtf8(result, codePoint);
      codePoint = 0;
      bytesNeeded = 0;
      bytesSeen = 0;
    }
  }
  if (bytesNeeded != 0) {
    appendUtf8(result, kReplacementCodePoint);
  }
  return result;
}

} // namespace

std::string normalizeEncodingLabel(std::string label) {
  constexpr auto isAsciiWhitespace = [](const unsigned char character) {
    return character == 0x09 || character == 0x0A || character == 0x0C || character == 0x0D || character == 0x20;
  };
  const auto begin = std::find_if_not(label.begin(), label.end(), isAsciiWhitespace);
  const auto end = std::find_if_not(label.rbegin(), label.rend(), isAsciiWhitespace).base();
  label = begin < end ? std::string(begin, end) : std::string{};
  std::transform(label.begin(), label.end(), label.begin(), [](const unsigned char character) {
    return static_cast<char>(std::tolower(character));
  });
  return label;
}

// https://encoding.spec.whatwg.org/#names-and-labels
bool isUtf8Label(const std::string &label) {
  return label.empty() || label == "utf-8" || label == "utf8" || label == "unicode-1-1-utf-8" ||
      label == "unicode11utf8" || label == "unicode20utf8" || label == "x-unicode20utf8";
}

// https://encoding.spec.whatwg.org/#names-and-labels
bool isWindows1252Label(const std::string &label) {
  return label == "ansi_x3.4-1968" || label == "ascii" || label == "cp1252" || label == "cp819" ||
      label == "csisolatin1" || label == "ibm819" || label == "iso-8859-1" || label == "iso-ir-100" ||
      label == "iso8859-1" || label == "iso88591" || label == "iso_8859-1" || label == "iso_8859-1:1987" ||
      label == "l1" || label == "latin1" || label == "us-ascii" || label == "windows-1252" || label == "x-cp1252";
}

std::string decodeUtf8(const uint8_t *data, const size_t size) {
  return decodeUtf8Impl(data, size);
}

std::string decodeWindows1252(const uint8_t *data, const size_t size) {
  return decodeWindows1252Impl(data, size);
}

// https://encoding.spec.whatwg.org/#shared-utf-16-decoder
std::string decodeUtf16(const uint8_t *data, const size_t size, const bool littleEndian) {
  std::string result;
  result.reserve(size);
  uint32_t leadSurrogate = 0;
  bool hasLeadSurrogate = false;
  size_t index = 0;
  while (index + 1 < size) {
    const uint32_t unit = littleEndian
        ? static_cast<uint32_t>(data[index]) | (static_cast<uint32_t>(data[index + 1]) << 8U)
        : (static_cast<uint32_t>(data[index]) << 8U) | static_cast<uint32_t>(data[index + 1]);
    index += 2;
    if (hasLeadSurrogate) {
      hasLeadSurrogate = false;
      if (unit >= 0xDC00 && unit <= 0xDFFF) {
        appendUtf8(result, 0x10000 + ((leadSurrogate - 0xD800) << 10U) + (unit - 0xDC00));
        continue;
      }
      appendUtf8(result, kReplacementCodePoint);
    }
    if (unit >= 0xD800 && unit <= 0xDBFF) {
      leadSurrogate = unit;
      hasLeadSurrogate = true;
    } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
      appendUtf8(result, kReplacementCodePoint);
    } else {
      appendUtf8(result, unit);
    }
  }
  if (hasLeadSurrogate || index != size) {
    appendUtf8(result, kReplacementCodePoint);
  }
  return result;
}

std::string toValidUtf8(const std::string &value) {
  return decodeUtf8Impl(reinterpret_cast<const uint8_t *>(value.data()), value.size());
}

} // namespace worklets::text
