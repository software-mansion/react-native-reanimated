/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import "RCTSegmentedControl.h"

#import "RCTConvert.h"
#import "UIView+React.h"
#import "RCTUIKit.h" // [macOS]

@implementation RCTSegmentedControl

- (instancetype)initWithFrame:(CGRect)frame
{
  if ((self = [super initWithFrame:frame])) {
    _selectedIndex = self.selectedSegmentIndex;
#if !TARGET_OS_OSX // [macOS]
    [self addTarget:self action:@selector(didChange) forControlEvents:UIControlEventValueChanged];
#else // [macOS
    self.segmentStyle = NSSegmentStyleRounded;    
    self.target = self;
    self.action = @selector(didChange);
#endif // macOS]
  }
  return self;
}

- (void)setValues:(NSArray<NSString *> *)values
{
  _values = [values copy];
#if !TARGET_OS_OSX // [macOS]
  [self removeAllSegments];
  for (NSString *value in values) {
    [self insertSegmentWithTitle:value atIndex:self.numberOfSegments animated:NO];
  }
#else // [macOS
  self.segmentCount = values.count;
  for (NSUInteger i = 0; i < values.count; i++) {
    [self setLabel:values[i] forSegment:i];
  }
#endif // macOS]
  self.selectedSegmentIndex = _selectedIndex; // [macOS]
}

- (void)setSelectedIndex:(NSInteger)selectedIndex
{
  _selectedIndex = selectedIndex;
  self.selectedSegmentIndex = selectedIndex; // [macOS]
}

#if !TARGET_OS_OSX // [macOS]
- (void)setBackgroundColor:(RCTUIColor *)backgroundColor // [macOS]
{
  [super setBackgroundColor:backgroundColor];
}

- (void)setTextColor:(RCTUIColor *)textColor // [macOS]
{
  [self setTitleTextAttributes:@{NSForegroundColorAttributeName : textColor} forState:UIControlStateNormal];
}

- (void)setTintColor:(UIColor *)tintColor // [macOS]
{
  [super setTintColor:tintColor];

  [self setSelectedSegmentTintColor:tintColor];
  [self setTitleTextAttributes:@{NSForegroundColorAttributeName : [UIColor whiteColor]}
                      forState:UIControlStateSelected];
  [self setTitleTextAttributes:@{NSForegroundColorAttributeName : tintColor} forState:UIControlStateNormal];
}
#endif // [macOS]

- (void)didChange
{
  _selectedIndex = self.selectedSegmentIndex;
  if (_onChange) {
    _onChange(@{@"value" : [self titleForSegmentAtIndex:_selectedIndex], @"selectedSegmentIndex" : @(_selectedIndex)});
  }
}

#if TARGET_OS_OSX // [macOS

- (BOOL)isFlipped
{
  return YES;
}

- (void)setMomentary:(BOOL)momentary
{
  self.trackingMode = momentary ? NSSegmentSwitchTrackingMomentary : NSSegmentSwitchTrackingSelectOne;
}

- (BOOL)isMomentary
{
  return self.trackingMode == NSSegmentSwitchTrackingMomentary;
}

- (void)setSelectedSegmentIndex:(NSInteger)selectedSegmentIndex
{
  self.selectedSegment = selectedSegmentIndex;
}

- (NSInteger)selectedSegmentIndex
{
  return self.selectedSegment;
}

- (NSString *)titleForSegmentAtIndex:(NSUInteger)segment
{
  return [self labelForSegment:segment];
}

- (void)setNumberOfSegments:(NSInteger)numberOfSegments
{
  self.segmentCount = numberOfSegments;
}

- (NSInteger)numberOfSegments
{
  return self.segmentCount;
}

#endif // macOS]

@end
