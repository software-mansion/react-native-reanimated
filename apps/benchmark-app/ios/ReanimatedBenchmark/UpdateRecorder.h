#import <UIKit/UIKit.h>

#include <cstdint>
#include <vector>

namespace benchmark {

struct UpdateRecord {
  uint64_t beginNs;
  uint64_t endNs;
  uint64_t modelTimeNs;
};

} // namespace benchmark

NS_ASSUME_NONNULL_BEGIN

@interface UpdateRecorder : NSObject

- (instancetype)initWithWindowScene:(UIWindowScene *)windowScene capacity:(size_t)capacity;

- (void)start;

- (void)stop;

@property (nonatomic, readonly, nullable) NSString *error;

- (const std::vector<benchmark::UpdateRecord> &)records;

@end

NS_ASSUME_NONNULL_END
