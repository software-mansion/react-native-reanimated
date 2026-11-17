#import <worklets/apple/Networking/WorkletsURLSessionDelegate.h>

#import <stdatomic.h>

#import <algorithm>
#import <optional>
#import <string>
#import <vector>

using namespace worklets;

static const NSTimeInterval kNoTimeoutInterval = 60 * 60 * 24 * 7;
static const CFAbsoluteTime kProgressThrottleInterval = 0.05;

static WorkletsURLSessionConfigurationProvider _Nullable sessionConfigurationProvider = nil;

void WorkletsSetCustomNSURLSessionConfigurationProvider(WorkletsURLSessionConfigurationProvider _Nullable provider)
{
  sessionConfigurationProvider = provider;
}

@interface WorkletsRequestState : NSObject {
 @public
  std::shared_ptr<NetworkRequestListener> listener;
  NSMutableData *data;
  uint64_t requestId;
  CFAbsoluteTime lastProgressTime;
  int64_t expectedContentLength;
  BOOL timedOut;
}
@end

@implementation WorkletsRequestState
@end

// NSURLSession exposes no reason phrase, so the status text is reconstructed
// from the IANA HTTP status code registry. It is not localized, matching what
// a server would have sent on the status line.
static std::string reasonPhraseForStatusCode(const NSInteger statusCode)
{
  switch (statusCode) {
    case 100:
      return "Continue";
    case 101:
      return "Switching Protocols";
    case 102:
      return "Processing";
    case 103:
      return "Early Hints";
    case 200:
      return "OK";
    case 201:
      return "Created";
    case 202:
      return "Accepted";
    case 203:
      return "Non-Authoritative Information";
    case 204:
      return "No Content";
    case 205:
      return "Reset Content";
    case 206:
      return "Partial Content";
    case 207:
      return "Multi-Status";
    case 208:
      return "Already Reported";
    case 226:
      return "IM Used";
    case 300:
      return "Multiple Choices";
    case 301:
      return "Moved Permanently";
    case 302:
      return "Found";
    case 303:
      return "See Other";
    case 304:
      return "Not Modified";
    case 305:
      return "Use Proxy";
    case 307:
      return "Temporary Redirect";
    case 308:
      return "Permanent Redirect";
    case 400:
      return "Bad Request";
    case 401:
      return "Unauthorized";
    case 402:
      return "Payment Required";
    case 403:
      return "Forbidden";
    case 404:
      return "Not Found";
    case 405:
      return "Method Not Allowed";
    case 406:
      return "Not Acceptable";
    case 407:
      return "Proxy Authentication Required";
    case 408:
      return "Request Timeout";
    case 409:
      return "Conflict";
    case 410:
      return "Gone";
    case 411:
      return "Length Required";
    case 412:
      return "Precondition Failed";
    case 413:
      return "Content Too Large";
    case 414:
      return "URI Too Long";
    case 415:
      return "Unsupported Media Type";
    case 416:
      return "Range Not Satisfiable";
    case 417:
      return "Expectation Failed";
    case 421:
      return "Misdirected Request";
    case 422:
      return "Unprocessable Content";
    case 423:
      return "Locked";
    case 424:
      return "Failed Dependency";
    case 425:
      return "Too Early";
    case 426:
      return "Upgrade Required";
    case 428:
      return "Precondition Required";
    case 429:
      return "Too Many Requests";
    case 431:
      return "Request Header Fields Too Large";
    case 451:
      return "Unavailable For Legal Reasons";
    case 500:
      return "Internal Server Error";
    case 501:
      return "Not Implemented";
    case 502:
      return "Bad Gateway";
    case 503:
      return "Service Unavailable";
    case 504:
      return "Gateway Timeout";
    case 505:
      return "HTTP Version Not Supported";
    case 506:
      return "Variant Also Negotiates";
    case 507:
      return "Insufficient Storage";
    case 508:
      return "Loop Detected";
    case 510:
      return "Not Extended";
    case 511:
      return "Network Authentication Required";
    default:
      return "";
  }
}

// Matches `METHODS_REQUIRING_BODY` in
// `android/src/main/java/com/swmansion/worklets/networking/Networking.kt`, so a
// bodyless POST carries `Content-Length: 0` on both platforms.
static BOOL methodRequiresBody(NSString *method)
{
  NSString *uppercasedMethod = method.uppercaseString;
  return [uppercasedMethod isEqualToString:@"POST"] || [uppercasedMethod isEqualToString:@"PUT"] ||
      [uppercasedMethod isEqualToString:@"PATCH"];
}

static NSInteger effectivePort(NSURL *url)
{
  if (url.port != nil) {
    return url.port.integerValue;
  }
  return [url.scheme caseInsensitiveCompare:@"https"] == NSOrderedSame ? 443 : 80;
}

static BOOL isSameOrigin(NSURL *lhs, NSURL *rhs)
{
  if (lhs == nil || rhs == nil || lhs.scheme == nil || rhs.scheme == nil || lhs.host == nil || rhs.host == nil) {
    return NO;
  }
  return [lhs.scheme caseInsensitiveCompare:rhs.scheme] == NSOrderedSame &&
      [lhs.host caseInsensitiveCompare:rhs.host] == NSOrderedSame && effectivePort(lhs) == effectivePort(rhs);
}

@implementation WorkletsURLSessionDelegate {
  NSURLSession *_session;
  NSURLSession *_credentiallessSession;
  NSOperationQueue *_delegateQueue;
  NSMapTable<NSURLSessionTask *, WorkletsRequestState *> *_statesByTask;
  NSMutableDictionary<NSNumber *, NSURLSessionDataTask *> *_tasksByRequestId;
  atomic_bool _invalidated;
}

- (instancetype)init
{
  if (self = [super init]) {
    _delegateQueue = [NSOperationQueue new];
    _delegateQueue.maxConcurrentOperationCount = 1;
    _statesByTask = [NSMapTable strongToStrongObjectsMapTable];
    _tasksByRequestId = [NSMutableDictionary new];
  }
  return self;
}

- (NSURLSessionConfiguration *)configuration
{
  WorkletsURLSessionConfigurationProvider provider = sessionConfigurationProvider;
  NSURLSessionConfiguration *configuration = provider != nil ? provider() : nil;
  if (configuration != nil) {
    return [configuration copy];
  }
  return [NSURLSessionConfiguration defaultSessionConfiguration];
}

- (NSURLSession *)sessionWithCredentials:(BOOL)withCredentials
{
  if (withCredentials) {
    if (_session == nil) {
      _session = [NSURLSession sessionWithConfiguration:[self configuration]
                                               delegate:self
                                          delegateQueue:_delegateQueue];
    }
    return _session;
  }
  if (_credentiallessSession == nil) {
    NSURLSessionConfiguration *configuration = [self configuration];
    configuration.HTTPCookieStorage = nil;
    configuration.HTTPShouldSetCookies = NO;
    configuration.HTTPCookieAcceptPolicy = NSHTTPCookieAcceptPolicyNever;
    configuration.URLCredentialStorage = nil;
    _credentiallessSession = [NSURLSession sessionWithConfiguration:configuration
                                                           delegate:self
                                                      delegateQueue:_delegateQueue];
  }
  return _credentiallessSession;
}

- (void)sendRequest:(RequestConfig &&)config
          requestId:(uint64_t)requestId
           listener:(std::shared_ptr<NetworkRequestListener>)listener
{
  NSString *urlString = [NSString stringWithUTF8String:config.url.c_str()];
  NSURL *url = urlString != nil ? [NSURL URLWithString:urlString] : nil;
  if (url == nil) {
    listener->onError(RequestError::Network, "Invalid URL: " + config.url);
    return;
  }
  if ([url.scheme caseInsensitiveCompare:@"http"] != NSOrderedSame &&
      [url.scheme caseInsensitiveCompare:@"https"] != NSOrderedSame) {
    listener->onError(RequestError::Network, "Unsupported URL scheme: " + config.url);
    return;
  }

  NSString *method = [NSString stringWithUTF8String:config.method.c_str()];
  if (method == nil) {
    listener->onError(RequestError::Network, "Invalid HTTP method: " + config.method);
    return;
  }

  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  request.HTTPMethod = method;
  for (const auto &[name, value] : config.headers) {
    NSString *headerName = [NSString stringWithUTF8String:name.c_str()];
    NSString *headerValue = [NSString stringWithUTF8String:value.c_str()];
    if (headerName == nil || headerValue == nil) {
      listener->onError(RequestError::Network, "Invalid header: " + name);
      return;
    }
    [request addValue:headerValue forHTTPHeaderField:headerName];
  }
  if (config.body.has_value()) {
    request.HTTPBody = [NSData dataWithBytes:config.body->data() length:config.body->size()];
  } else if (methodRequiresBody(method)) {
    request.HTTPBody = [NSData data];
  }
  request.HTTPShouldHandleCookies = config.withCredentials;
  request.timeoutInterval = config.timeoutMs > 0 ? config.timeoutMs / 1000.0 : kNoTimeoutInterval;

  const auto timeoutMs = config.timeoutMs;
  const auto withCredentials = config.withCredentials;

  [_delegateQueue addOperationWithBlock:^{
    if (atomic_load(&self->_invalidated)) {
      listener->onError(RequestError::Aborted, "The networking session was invalidated.");
      return;
    }
    NSURLSessionDataTask *task = [[self sessionWithCredentials:withCredentials] dataTaskWithRequest:request];
    if (task == nil) {
      listener->onError(RequestError::Network, "Failed to create a data task for the request.");
      return;
    }
    WorkletsRequestState *state = [WorkletsRequestState new];
    state->listener = listener;
    state->data = [NSMutableData new];
    state->requestId = requestId;
    state->expectedContentLength = -1;
    [self->_statesByTask setObject:state forKey:task];
    self->_tasksByRequestId[@(requestId)] = task;
    [task resume];
  }];

  if (timeoutMs > 0) {
    __weak WorkletsURLSessionDelegate *weakSelf = self;
    dispatch_after(
        dispatch_time(DISPATCH_TIME_NOW, (int64_t)(timeoutMs * NSEC_PER_MSEC)),
        dispatch_get_global_queue(QOS_CLASS_UTILITY, 0),
        ^{ [weakSelf timeoutRequest:requestId]; });
  }
}

- (void)timeoutRequest:(uint64_t)requestId
{
  [_delegateQueue addOperationWithBlock:^{
    NSURLSessionDataTask *task = self->_tasksByRequestId[@(requestId)];
    if (task == nil) {
      return;
    }
    WorkletsRequestState *state = [self->_statesByTask objectForKey:task];
    if (state != nil) {
      state->timedOut = YES;
    }
    [task cancel];
  }];
}

- (void)abortRequest:(uint64_t)requestId
{
  [_delegateQueue addOperationWithBlock:^{ [self->_tasksByRequestId[@(requestId)] cancel]; }];
}

- (void)invalidate
{
  atomic_store(&_invalidated, true);
  [_delegateQueue addOperationWithBlock:^{
    [self->_session invalidateAndCancel];
    [self->_credentiallessSession invalidateAndCancel];
  }];
}

- (void)URLSession:(NSURLSession *)session
                          task:(NSURLSessionTask *)task
    willPerformHTTPRedirection:(NSHTTPURLResponse *)response
                    newRequest:(NSURLRequest *)request
             completionHandler:(void (^)(NSURLRequest *_Nullable))completionHandler
{
  if (isSameOrigin(task.currentRequest.URL ?: task.originalRequest.URL, request.URL)) {
    completionHandler(request);
    return;
  }
  NSMutableURLRequest *nextRequest = [request mutableCopy];
  for (NSString *header in @[ @"Authorization", @"Cookie", @"Cookie2", @"Proxy-Authorization", @"WWW-Authenticate" ]) {
    [nextRequest setValue:nil forHTTPHeaderField:header];
  }
  completionHandler(nextRequest);
}

- (void)URLSession:(NSURLSession *)session
              dataTask:(NSURLSessionDataTask *)dataTask
    didReceiveResponse:(NSURLResponse *)response
     completionHandler:(void (^)(NSURLSessionResponseDisposition))completionHandler
{
  WorkletsRequestState *state = [_statesByTask objectForKey:dataTask];
  if (state != nil) {
    int status = 200;
    std::string statusText;
    std::vector<std::pair<std::string, std::string>> headers;
    if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
      NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
      status = (int)httpResponse.statusCode;
      statusText = reasonPhraseForStatusCode(httpResponse.statusCode);
      for (NSString *name in httpResponse.allHeaderFields) {
        NSString *value = httpResponse.allHeaderFields[name];
        headers.emplace_back(name.UTF8String ?: "", value.UTF8String ?: "");
      }
    }
    state->expectedContentLength = response.expectedContentLength;
    state->listener->onResponse(ResponseInfo{
        .status = status,
        .statusText = std::move(statusText),
        .headers = std::move(headers),
        .url = response.URL.absoluteString.UTF8String ?: ""});
  }
  completionHandler(NSURLSessionResponseAllow);
}

- (void)URLSession:(NSURLSession *)session dataTask:(NSURLSessionDataTask *)dataTask didReceiveData:(NSData *)data
{
  WorkletsRequestState *state = [_statesByTask objectForKey:dataTask];
  if (state == nil) {
    return;
  }
  [state->data appendData:data];
  const CFAbsoluteTime now = CFAbsoluteTimeGetCurrent();
  if (now - state->lastProgressTime >= kProgressThrottleInterval) {
    state->lastProgressTime = now;
    state->listener->onDownloadProgress((int64_t)state->data.length, state->expectedContentLength);
  }
}

- (void)URLSession:(NSURLSession *)session
                        task:(NSURLSessionTask *)task
             didSendBodyData:(int64_t)bytesSent
              totalBytesSent:(int64_t)totalBytesSent
    totalBytesExpectedToSend:(int64_t)totalBytesExpectedToSend
{
  WorkletsRequestState *state = [_statesByTask objectForKey:task];
  if (state != nil) {
    state->listener->onUploadProgress(totalBytesSent, totalBytesExpectedToSend);
  }
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error
{
  WorkletsRequestState *state = [_statesByTask objectForKey:task];
  if (state == nil) {
    return;
  }
  [_statesByTask removeObjectForKey:task];
  [_tasksByRequestId removeObjectForKey:@(state->requestId)];

  if (error != nil) {
    auto kind = RequestError::Network;
    if (state->timedOut || error.code == NSURLErrorTimedOut) {
      kind = RequestError::Timeout;
    } else if (error.code == NSURLErrorCancelled) {
      kind = RequestError::Aborted;
    }
    state->listener->onError(kind, error.localizedDescription.UTF8String ?: "");
    return;
  }

  const auto *bytes = static_cast<const uint8_t *>(state->data.bytes);
  state->listener->onComplete(std::vector<uint8_t>(bytes, bytes + state->data.length));
}

@end
