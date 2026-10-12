#pragma once

#include <cstddef>
#include <cstdint>
#include <string>

namespace worklets::text {

/**
 * Decoders for the WHATWG Encoding Standard subset the networking module
 * handles in C++. Every function returns well-formed UTF-8, so the result is
 * always safe to hand to `jsi::String::createFromUtf8`, whose behavior is
 * undefined for invalid UTF-8.
 */

/** Normalizes an encoding label: trims ASCII whitespace and lowercases. */
std::string normalizeEncodingLabel(std::string label);

bool isUtf8Label(const std::string &label);
bool isWindows1252Label(const std::string &label);

std::string decodeUtf8(const uint8_t *data, size_t size);
std::string decodeUtf16(const uint8_t *data, size_t size, bool littleEndian);
std::string decodeWindows1252(const uint8_t *data, size_t size);

/** Replaces malformed sequences in an already-UTF-8-ish string with U+FFFD. */
std::string toValidUtf8(const std::string &value);

} // namespace worklets::text
