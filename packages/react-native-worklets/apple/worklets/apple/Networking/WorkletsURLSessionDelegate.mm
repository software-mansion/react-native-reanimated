#import <worklets/apple/Networking/WorkletsURLSessionDelegate.h>

#import <string>
#import <vector>

using namespace worklets;

@interface WorkletsRequestState : NSObject {
 @public
  std::shared_ptr<NetworkRequestListener> listener;
  ResponseKind responseKind;
  NSMutableData *data;
  NSString *textEncodingName;
  uint64_t requestId;
  CFAbsoluteTime lastProgressTime;
  int64_t expectedContentLength;
  BOOL timedOut;
}
@end

@implementation WorkletsRequestState
@end

static std::string decodeTextData(NSData *data, NSString *textEncodingName)
{
  NSStringEncoding encoding = NSUTF8StringEncoding;
  if (textEncodingName != nil) {
    const CFStringEncoding cfEncoding = CFStringConvertIANACharSetNameToEncoding((CFStringRef)textEncodingName);
    if (cfEncoding != kCFStringEncodingInvalidId) {
      encoding = CFStringConvertEncodingToNSStringEncoding(cfEncoding);
    }
  }
  NSString *string = [[NSString alloc] initWithData:data encoding:encoding];
  if (string == nil && encoding != NSUTF8StringEncoding) {
    string = [[NSString alloc] initWithData:data encoding:NSUTF8StringEncoding];
  }
  if (string == nil) {
    string = [[NSString alloc] initWithData:data encoding:NSISOLatin1StringEncoding];
  }
  const char *utf8 = string.UTF8String;
  if (utf8 == nullptr) {
    return {};
  }
  return std::string(utf8, [string lengthOfBytesUsingEncoding:NSUTF8StringEncoding]);
}

@implementation WorkletsURLSessionDelegate {
  NSURLSession *_session;
  NSOperationQueue *_delegateQueue;
  NSMutableDictionary<NSNumber *, WorkletsRequestState *> *_statesByTaskId;
  NSMutableDictionary<NSNumber *, NSURLSessionDataTask *> *_tasksByRequestId;
}

- (instancetype)init
{
  if (self = [super init]) {
    _delegateQueue = [NSOperationQueue new];
    _delegateQueue.maxConcurrentOperationCount = 1;
    _session = [NSURLSession sessionWithConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]
                                             delegate:self
                                        delegateQueue:_delegateQueue];
    _statesByTaskId = [NSMutableDictionary new];
    _tasksByRequestId = [NSMutableDictionary new];
  }
  return self;
}

- (void)sendRequest:(RequestConfig &&)config
          requestId:(uint64_t)requestId
           listener:(const std::shared_ptr<NetworkRequestListener> &)listener
{
  NSURL *url = [NSURL URLWithString:[NSString stringWithUTF8String:config.url.c_str()] ?: @""];
  if (url == nil) {
    listener->onError(RequestError::Network, "Invalid URL: " + config.url);
    return;
  }

  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  request.HTTPMethod = [NSString stringWithUTF8String:config.method.c_str()] ?: @"GET";
  for (const auto &[name, value] : config.headers) {
    NSString *headerName = [NSString stringWithUTF8String:name.c_str()];
    NSString *headerValue = [NSString stringWithUTF8String:value.c_str()];
    if (headerName != nil && headerValue != nil) {
      [request addValue:headerValue forHTTPHeaderField:headerName];
    }
  }
  if (config.body.has_value()) {
    request.HTTPBody = [NSData dataWithBytes:config.body->data() length:config.body->size()];
  }
  request.HTTPShouldHandleCookies = config.withCredentials;
  if (config.timeoutMs > 0) {
    request.timeoutInterval = config.timeoutMs / 1000.0;
  }

  const auto sharedListener = listener;
  const auto responseKind = config.responseKind;
  const auto timeoutMs = config.timeoutMs;

  [_delegateQueue addOperationWithBlock:^{
    NSURLSessionDataTask *task = [self->_session dataTaskWithRequest:request];
    WorkletsRequestState *state = [WorkletsRequestState new];
    state->listener = sharedListener;
    state->responseKind = responseKind;
    state->data = [NSMutableData new];
    state->requestId = requestId;
    state->expectedContentLength = -1;
    self->_statesByTaskId[@(task.taskIdentifier)] = state;
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
    WorkletsRequestState *state = self->_statesByTaskId[@(task.taskIdentifier)];
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
  [_session invalidateAndCancel];
}

- (void)URLSession:(NSURLSession *)session
              dataTask:(NSURLSessionDataTask *)dataTask
    didReceiveResponse:(NSURLResponse *)response
     completionHandler:(void (^)(NSURLSessionResponseDisposition))completionHandler
{
  WorkletsRequestState *state = _statesByTaskId[@(dataTask.taskIdentifier)];
  if (state != nil) {
    int status = 200;
    std::string statusText;
    std::vector<std::pair<std::string, std::string>> headers;
    if ([response isKindOfClass:[NSHTTPURLResponse class]]) {
      NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
      status = (int)httpResponse.statusCode;
      statusText = [NSHTTPURLResponse localizedStringForStatusCode:httpResponse.statusCode].UTF8String ?: "";
      for (NSString *name in httpResponse.allHeaderFields) {
        NSString *value = httpResponse.allHeaderFields[name];
        headers.emplace_back(name.UTF8String ?: "", value.UTF8String ?: "");
      }
    }
    state->expectedContentLength = response.expectedContentLength;
    state->textEncodingName = response.textEncodingName;
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
  WorkletsRequestState *state = _statesByTaskId[@(dataTask.taskIdentifier)];
  if (state == nil) {
    return;
  }
  [state->data appendData:data];
  const CFAbsoluteTime now = CFAbsoluteTimeGetCurrent();
  if (now - state->lastProgressTime >= 0.1) {
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
  WorkletsRequestState *state = _statesByTaskId[@(task.taskIdentifier)];
  if (state != nil) {
    state->listener->onUploadProgress(totalBytesSent, totalBytesExpectedToSend);
  }
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *)error
{
  WorkletsRequestState *state = _statesByTaskId[@(task.taskIdentifier)];
  if (state == nil) {
    return;
  }
  [_statesByTaskId removeObjectForKey:@(task.taskIdentifier)];
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

  if (state->responseKind == ResponseKind::Text) {
    state->listener->onCompleteText(decodeTextData(state->data, state->textEncodingName));
  } else {
    const auto *bytes = static_cast<const uint8_t *>(state->data.bytes);
    state->listener->onCompleteBytes(std::vector<uint8_t>(bytes, bytes + state->data.length));
  }
}

@end
