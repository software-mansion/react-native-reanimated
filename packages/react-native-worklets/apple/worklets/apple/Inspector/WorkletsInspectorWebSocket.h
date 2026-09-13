#pragma once

#import <worklets/Inspector/WorkletsInspectorConnection.h>

#import <Foundation/Foundation.h>

#import <memory>
#import <string>

namespace worklets {

/**
 * Creates the Worklets inspector connection for the given bundle URL, or
 * returns nullptr when React Native DevTools is disabled or the bundle is not
 * served by a dev server.
 */
std::shared_ptr<WorkletsInspectorConnection> makeWorkletsInspectorConnection(NSURL *bundleURL);

} // namespace worklets
