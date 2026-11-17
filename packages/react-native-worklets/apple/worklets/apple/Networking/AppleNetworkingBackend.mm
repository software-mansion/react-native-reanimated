#import <worklets/apple/Networking/AppleNetworkingBackend.h>
#import <worklets/apple/Networking/WorkletsURLSessionDelegate.h>

#import <algorithm>
#import <optional>
#import <string>
#import <utility>

namespace worklets {

namespace {
NSString *decodeLossy(const uint8_t *data, size_t size, NSStringEncoding encoding, CFStringEncoding cfEncoding);
} // namespace

AppleNetworkingBackend::AppleNetworkingBackend() : delegate_([WorkletsURLSessionDelegate new]) {}

AppleNetworkingBackend::~AppleNetworkingBackend()
{
  [delegate_ invalidate];
}

void AppleNetworkingBackend::sendRequest(
    const uint64_t requestId,
    RequestConfig &&config,
    const std::shared_ptr<NetworkRequestListener> &listener)
{
  [delegate_ sendRequest:std::move(config) requestId:requestId listener:listener];
}

void AppleNetworkingBackend::abortRequest(const uint64_t requestId)
{
  [delegate_ abortRequest:requestId];
}

std::optional<std::string>
AppleNetworkingBackend::decodeText(const uint8_t *data, const size_t size, const std::string &label)
{
  NSString *charsetName = [NSString stringWithUTF8String:label.c_str()];
  if (charsetName == nil) {
    return std::nullopt;
  }
  const CFStringEncoding cfEncoding = CFStringConvertIANACharSetNameToEncoding((__bridge CFStringRef)charsetName);
  if (cfEncoding == kCFStringEncodingInvalidId) {
    return std::nullopt;
  }
  NSString *decoded = decodeLossy(data, size, CFStringConvertEncodingToNSStringEncoding(cfEncoding), cfEncoding);
  if (decoded == nil) {
    return std::nullopt;
  }
  const char *utf8 = decoded.UTF8String;
  if (utf8 == nullptr) {
    return std::nullopt;
  }
  return std::string(utf8, [decoded lengthOfBytesUsingEncoding:NSUTF8StringEncoding]);
}

namespace {

/**
 * https://encoding.spec.whatwg.org/#concept-encoding-process - a decoder never
 * fails, it emits U+FFFD for every byte it cannot decode. `NSString` instead
 * returns nil for the whole buffer, so a body truncated mid-character is
 * retried without its trailing bytes and each dropped byte becomes U+FFFD.
 */
NSString *
decodeLossy(const uint8_t *data, const size_t size, const NSStringEncoding encoding, const CFStringEncoding cfEncoding)
{
  NSData *bytes = [NSData dataWithBytesNoCopy:(void *)data length:size freeWhenDone:NO];
  NSString *decoded = [[NSString alloc] initWithData:bytes encoding:encoding];
  if (decoded != nil) {
    return decoded;
  }

  const CFIndex maxCharLength = CFStringGetMaximumSizeForEncoding(2, cfEncoding);
  const size_t limit = std::min(maxCharLength > 0 ? static_cast<size_t>(maxCharLength) : 1, size);
  for (size_t trimmed = 1; trimmed <= limit; trimmed++) {
    NSData *prefix = [NSData dataWithBytesNoCopy:(void *)data length:size - trimmed freeWhenDone:NO];
    NSString *prefixDecoded = [[NSString alloc] initWithData:prefix encoding:encoding];
    if (prefixDecoded == nil) {
      continue;
    }
    NSMutableString *result = [prefixDecoded mutableCopy];
    for (size_t index = 0; index < trimmed; index++) {
      [result appendString:@"\uFFFD"];
    }
    return result;
  }
  return nil;
}

} // namespace

} // namespace worklets
