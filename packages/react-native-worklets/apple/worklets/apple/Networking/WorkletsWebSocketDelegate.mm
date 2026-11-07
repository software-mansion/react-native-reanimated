#import <worklets/apple/Networking/WorkletsWebSocketDelegate.h>

#import <atomic>
#import <memory>
#import <string>
#import <unordered_map>
#import <utility>
#import <vector>

using namespace worklets;

namespace {

/**
 * Holds the state of one socket. The listener is released together with the
 * record, after `onClose` was delivered, so the JSI handles its callback
 * retains outlive neither the socket nor its runtime.
 */
/** Caps one incoming frame, so a hostile peer cannot exhaust memory. */
constexpr NSInteger kMaxMessageBytes = 16 * 1024 * 1024;

struct SocketRecord {
  NSURLSessionWebSocketTask *task;
  std::shared_ptr<WebSocketListener> listener;
  bool closeReported;
  bool noStatus;
};

NSString *_Nullable toNSString(const std::string &value)
{
  return [[NSString alloc] initWithBytes:value.data() length:value.size() encoding:NSUTF8StringEncoding];
}

std::string toStdString(NSString *_Nullable string)
{
  if (string == nil) {
    return {};
  }
  const char *utf8 = string.UTF8String;
  return utf8 != nullptr ? std::string(utf8, [string lengthOfBytesUsingEncoding:NSUTF8StringEncoding]) : std::string{};
}

} // namespace

@implementation WorkletsWebSocketDelegate {
  NSURLSession *_session;
  std::shared_ptr<std::unordered_map<uint64_t, SocketRecord>> _state;
  NSLock *_lock;
  std::atomic_bool _invalidated;
}

- (instancetype)init
{
  if (self = [super init]) {
    _state = std::make_shared<std::unordered_map<uint64_t, SocketRecord>>();
    _lock = [NSLock new];
    NSOperationQueue *queue = [NSOperationQueue new];
    /**
     * `NSURLSession.h` requires a serial queue to keep callbacks ordered. The
     * lock guards the socket table; it cannot substitute for that ordering.
     */
    queue.maxConcurrentOperationCount = 1;
    _session = [NSURLSession sessionWithConfiguration:[NSURLSessionConfiguration defaultSessionConfiguration]
                                             delegate:self
                                        delegateQueue:queue];
  }
  return self;
}

- (void)connect:(WebSocketConfig &&)config
       socketId:(uint64_t)socketId
       listener:(std::shared_ptr<WebSocketListener>)listener
{
  NSString *urlString = toNSString(config.url);
  NSURL *url = urlString != nil ? [NSURL URLWithString:urlString] : nil;
  if (url == nil) {
    [self failConnect:listener message:"Invalid WebSocket URL."];
    return;
  }

  NSMutableURLRequest *request = [NSMutableURLRequest requestWithURL:url];
  for (const auto &[name, value] : config.headers) {
    NSString *headerName = toNSString(name);
    NSString *headerValue = toNSString(value);
    if (headerName == nil || headerValue == nil) {
      [self failConnect:listener message:"Invalid WebSocket header."];
      return;
    }
    [request setValue:headerValue forHTTPHeaderField:headerName];
  }

  NSURLSessionWebSocketTask *socketTask;
  if (config.protocols.empty()) {
    socketTask = [_session webSocketTaskWithRequest:request];
  } else {
    NSMutableArray<NSString *> *protocols = [NSMutableArray arrayWithCapacity:config.protocols.size()];
    for (const auto &protocol : config.protocols) {
      NSString *value = toNSString(protocol);
      if (value == nil) {
        [self failConnect:listener message:"Invalid WebSocket subprotocol."];
        return;
      }
      [protocols addObject:value];
    }
    if (config.headers.empty()) {
      /**
       * `Sec-` is a reserved header prefix that Foundation may drop, so the
       * subprotocols go through the API made for them. It only accepts a URL,
       * so the header form is kept for a request that carries custom headers.
       */
      socketTask = [_session webSocketTaskWithURL:url protocols:protocols];
    } else {
      [request setValue:[protocols componentsJoinedByString:@", "] forHTTPHeaderField:@"Sec-WebSocket-Protocol"];
      socketTask = [_session webSocketTaskWithRequest:request];
    }
  }

  if (socketTask == nil) {
    [self failConnect:listener message:"Could not create the WebSocket task."];
    return;
  }

  socketTask.maximumMessageSize = kMaxMessageBytes;
  socketTask.taskDescription = [NSString stringWithFormat:@"%llu", socketId];

  [_lock lock];
  if (_invalidated.load()) {
    // `invalidate` sets the flag before taking the lock, so testing it here
    // means either it sees this record or this never registers.
    [_lock unlock];
    [socketTask cancel];
    [self failConnect:listener message:"The networking module was invalidated."];
    return;
  }
  (*_state)[socketId] = SocketRecord{socketTask, std::move(listener), false, false};
  [_lock unlock];

  [socketTask resume];
  [self receiveNext:socketId];
}

- (void)failConnect:(const std::shared_ptr<WebSocketListener> &)listener message:(const char *)message
{
  listener->onError(message);
  listener->onClose(static_cast<uint16_t>(WebSocketCloseCode::AbnormalClosure), "", false);
}

- (void)sendText:(uint64_t)socketId message:(std::string &&)message
{
  NSURLSessionWebSocketTask *task = [self taskFor:socketId];
  if (task == nil) {
    return;
  }
  NSString *text = toNSString(message);
  if (text == nil) {
    [self failSocket:socketId message:"The message is not valid UTF-8."];
    return;
  }
  const auto byteCount = static_cast<int64_t>(message.size());
  NSURLSessionWebSocketMessage *wsMessage = [[NSURLSessionWebSocketMessage alloc] initWithString:text];
  __weak __typeof(self) weakSelf = self;
  [task sendMessage:wsMessage
      completionHandler:^(NSError *_Nullable error) {
        if (error != nil) {
          [weakSelf failSocket:socketId message:toStdString(error.localizedDescription)];
          return;
        }
        [weakSelf reportFlushed:socketId bytes:byteCount];
      }];
}

- (void)sendBinary:(uint64_t)socketId message:(std::vector<uint8_t> &&)message
{
  NSURLSessionWebSocketTask *task = [self taskFor:socketId];
  if (task == nil) {
    return;
  }
  NSData *data = [NSData dataWithBytes:message.data() length:message.size()];
  const auto byteCount = static_cast<int64_t>(message.size());
  NSURLSessionWebSocketMessage *wsMessage = [[NSURLSessionWebSocketMessage alloc] initWithData:data];
  __weak __typeof(self) weakSelf = self;
  [task sendMessage:wsMessage
      completionHandler:^(NSError *_Nullable error) {
        if (error != nil) {
          [weakSelf failSocket:socketId message:toStdString(error.localizedDescription)];
          return;
        }
        [weakSelf reportFlushed:socketId bytes:byteCount];
      }];
}

- (void)close:(uint64_t)socketId code:(uint16_t)code reason:(std::string &&)reason
{
  NSURLSessionWebSocketTask *task = [self taskFor:socketId];
  if (task == nil) {
    return;
  }
  NSData *reasonData = [NSData dataWithBytes:reason.data() length:reason.size()];
  /**
   * https://www.rfc-editor.org/rfc/rfc6455#section-7.4.1 - 1005 may never go on
   * the wire. The frame carries a normal closure and the socket is recorded so
   * the close event still reports 1005, as the peer would have produced.
   */
  auto wireCode = static_cast<NSURLSessionWebSocketCloseCode>(code);
  if (code == static_cast<uint16_t>(WebSocketCloseCode::NoStatusReceived)) {
    wireCode = NSURLSessionWebSocketCloseCodeNormalClosure;
    [_lock lock];
    const auto record = _state->find(socketId);
    if (record != _state->end()) {
      record->second.noStatus = true;
    }
    [_lock unlock];
  }
  [task cancelWithCloseCode:wireCode reason:reasonData];
}

- (void)invalidate
{
  _invalidated.store(true);
  [_lock lock];
  auto state = std::move(*_state);
  _state->clear();
  [_lock unlock];
  for (auto &[socketId, record] : state) {
    [record.task cancelWithCloseCode:NSURLSessionWebSocketCloseCodeGoingAway reason:nil];
    if (!record.closeReported && record.listener) {
      record.listener->onClose(static_cast<uint16_t>(WebSocketCloseCode::NoStatusReceived), "", false);
    }
  }
  [_session invalidateAndCancel];
}

#pragma mark - NSURLSessionWebSocketDelegate

- (void)URLSession:(NSURLSession *)session
          webSocketTask:(NSURLSessionWebSocketTask *)webSocketTask
    didOpenWithProtocol:(NSString *_Nullable)protocol
{
  const uint64_t socketId = webSocketTask.taskDescription.longLongValue;
  if (auto listener = [self listenerFor:socketId]) {
    // NSURLSession does not surface the negotiated extensions.
    listener->onOpen(toStdString(protocol), "");
  }
}

- (void)URLSession:(NSURLSession *)session
       webSocketTask:(NSURLSessionWebSocketTask *)webSocketTask
    didCloseWithCode:(NSURLSessionWebSocketCloseCode)closeCode
              reason:(NSData *_Nullable)reason
{
  const uint64_t socketId = webSocketTask.taskDescription.longLongValue;
  std::string reasonText;
  if (reason != nil) {
    reasonText.assign(static_cast<const char *>(reason.bytes), reason.length);
  }
  [self reportClose:socketId code:static_cast<uint16_t>(closeCode) reason:std::move(reasonText) wasClean:YES];
}

- (void)URLSession:(NSURLSession *)session task:(NSURLSessionTask *)task didCompleteWithError:(NSError *_Nullable)error
{
  if (![task isKindOfClass:[NSURLSessionWebSocketTask class]]) {
    return;
  }
  const uint64_t socketId = task.taskDescription.longLongValue;
  if (error == nil) {
    // `didCloseWithCode:` already reported a close if the handshake completed.
    [self reportClose:socketId code:static_cast<uint16_t>(WebSocketCloseCode::NoStatusReceived) reason:"" wasClean:YES];
    return;
  }
  [self reportError:socketId message:toStdString(error.localizedDescription)];
  [self reportClose:socketId code:static_cast<uint16_t>(WebSocketCloseCode::AbnormalClosure) reason:"" wasClean:NO];
}

#pragma mark - Private

- (void)receiveNext:(uint64_t)socketId
{
  NSURLSessionWebSocketTask *task = [self taskFor:socketId];
  if (task == nil) {
    return;
  }
  __weak __typeof(self) weakSelf = self;
  [task
      receiveMessageWithCompletionHandler:^(NSURLSessionWebSocketMessage *_Nullable message, NSError *_Nullable error) {
        __typeof(self) strongSelf = weakSelf;
        if (strongSelf == nil) {
          return;
        }
        if (error != nil) {
          // `didCompleteWithError` reports the close, so the read loop just stops.
          return;
        }
        if (auto listener = [strongSelf listenerFor:socketId]) {
          if (message.type == NSURLSessionWebSocketMessageTypeString) {
            listener->onTextMessage(toStdString(message.string));
          } else {
            NSData *data = message.data;
            const auto *bytes = static_cast<const uint8_t *>(data.bytes);
            listener->onBinaryMessage(std::vector<uint8_t>(bytes, bytes + data.length));
          }
        }
        [strongSelf receiveNext:socketId];
      }];
}

- (nullable NSURLSessionWebSocketTask *)taskFor:(uint64_t)socketId
{
  [_lock lock];
  const auto record = _state->find(socketId);
  NSURLSessionWebSocketTask *task = record != _state->end() ? record->second.task : nil;
  [_lock unlock];
  return task;
}

- (std::shared_ptr<WebSocketListener>)listenerFor:(uint64_t)socketId
{
  [_lock lock];
  const auto record = _state->find(socketId);
  auto listener = record != _state->end() ? record->second.listener : nullptr;
  [_lock unlock];
  return listener;
}

/** The spec has no standalone error event - it always precedes a close. */
- (void)failSocket:(uint64_t)socketId message:(std::string)message
{
  [[self taskFor:socketId] cancel];
  [self reportError:socketId message:std::move(message)];
  [self reportClose:socketId code:static_cast<uint16_t>(WebSocketCloseCode::AbnormalClosure) reason:"" wasClean:NO];
}

- (void)reportFlushed:(uint64_t)socketId bytes:(int64_t)bytes
{
  if (auto listener = [self listenerFor:socketId]) {
    listener->onFlushed(bytes);
  }
}

- (void)reportError:(uint64_t)socketId message:(std::string)message
{
  if (auto listener = [self listenerFor:socketId]) {
    listener->onError(std::move(message));
  }
}

- (void)reportClose:(uint64_t)socketId code:(uint16_t)code reason:(std::string)reason wasClean:(BOOL)wasClean
{
  [_lock lock];
  const auto record = _state->find(socketId);
  if (record == _state->end() || record->second.closeReported) {
    [_lock unlock];
    return;
  }
  record->second.closeReported = true;
  auto listener = record->second.listener;
  const bool noStatus = record->second.noStatus;
  _state->erase(record);
  [_lock unlock];

  if (listener) {
    const auto reported = noStatus && code == static_cast<uint16_t>(NSURLSessionWebSocketCloseCodeNormalClosure)
        ? static_cast<uint16_t>(WebSocketCloseCode::NoStatusReceived)
        : code;
    listener->onClose(reported, std::move(reason), wasClean == YES);
  }
}

@end
