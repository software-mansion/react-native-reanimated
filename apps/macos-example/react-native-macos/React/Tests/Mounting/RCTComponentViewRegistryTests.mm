/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#import <React/RCTComponentViewRegistry.h>
#import <React/RCTViewComponentView.h>
#import <XCTest/XCTest.h>

@interface RCTComponentViewRegistryTests : XCTestCase
@end

using namespace facebook::react;

@implementation RCTComponentViewRegistryTests {
  RCTComponentViewRegistry *_componentViewRegistry;
}

- (void)setUp
{
  [super setUp];
  _componentViewRegistry = [RCTComponentViewRegistry new];
  [_componentViewRegistry.componentViewFactory registerComponentViewClass:[RCTViewComponentView class]];
}

- (void)testComponentViewDescriptorWithTag
{
  XCTAssertThrows(
      ^{
        Tag nonExistingTag = 12;
        [self->_componentViewRegistry componentViewDescriptorWithTag:nonExistingTag];
      }(),
      @"Should throw: `Attempt to query unregistered component`");

  Tag existingTag = 2;
  auto newViewDescriptor = [_componentViewRegistry
      dequeueComponentViewWithComponentHandle:[RCTViewComponentView componentDescriptorProvider].handle
                                          tag:existingTag];

  XCTAssertNoThrow(^{
    auto componentDescriptor = [self->_componentViewRegistry componentViewDescriptorWithTag:existingTag];
    XCTAssertEqual(newViewDescriptor, componentDescriptor);
  }());
}

- (void)testFindComponentViewWithTag
{
  Tag nonExistingTag = 12;
  XCTAssertNil([_componentViewRegistry findComponentViewWithTag:nonExistingTag]);

  Tag existingTag = 2;
  auto newViewDescriptor = [_componentViewRegistry
      dequeueComponentViewWithComponentHandle:[RCTViewComponentView componentDescriptorProvider].handle
                                          tag:existingTag];

  XCTAssertEqual(newViewDescriptor.view, [_componentViewRegistry findComponentViewWithTag:existingTag]);
}

- (void)testDequeueAndEnqueue
{
  Tag existingTag = 2;
  auto newViewDescriptor = [_componentViewRegistry
      dequeueComponentViewWithComponentHandle:[RCTViewComponentView componentDescriptorProvider].handle
                                          tag:existingTag];

  XCTAssertThrows(
      ^{
        [self->_componentViewRegistry
            dequeueComponentViewWithComponentHandle:[RCTViewComponentView componentDescriptorProvider].handle
                                                tag:existingTag];
      }(),
      @"Should throw: `Attempt to dequeue already registered component`");

  XCTAssertThrows(
      ^{
        Tag nonExistingTag = 12;
        [self->_componentViewRegistry
            enqueueComponentViewWithComponentHandle:[RCTViewComponentView componentDescriptorProvider].handle
                                                tag:nonExistingTag
                            componentViewDescriptor:newViewDescriptor];
      }(),
      @"Should throw: `Attempt to enqueue unregistered component`");
}

@end
