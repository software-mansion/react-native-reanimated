/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

#pragma once

#include <chrono>
#include <condition_variable>
#include <optional>

#include <react/renderer/debug/flags.h>
#include <react/renderer/mounting/Differentiator.h>
#include <react/renderer/mounting/MountingOverrideDelegate.h>
#include <react/renderer/mounting/MountingTransaction.h>
#include <react/renderer/mounting/ShadowTreeRevision.h>
#include <react/renderer/mounting/TelemetryController.h>
#include "ShadowTreeRevision.h"

#ifdef RN_SHADOW_TREE_INTROSPECTION
#include <react/renderer/mounting/stubs.h>
#endif

namespace facebook::react {

/*
 * Stores inside all non-mounted yet revisions of a shadow tree and coordinates
 * mounting. The object stores the most recent mounted revision and the most
 * recent committed one. Then when a new mounting transaction is requested the
 * object generates mutation instructions and returns it as a
 * `MountingTransaction`.
 */
class MountingCoordinator final {
 public:
  using Shared = std::shared_ptr<const MountingCoordinator>;

  /*
   * The constructor is meant to be used only inside `ShadowTree`, and it's
   * `public` only to enable using with `std::make_shared<>`.
   */
  MountingCoordinator(const ShadowTreeRevision& baseRevision);

  /*
   * Returns the id of the surface that the coordinator belongs to.
   */
  SurfaceId getSurfaceId() const;

  /*
   * Computes a consequent mounting transaction and returns it.
   * The returning transaction can accumulate multiple recent revisions of a
   * shadow tree. Returns empty optional if there no new shadow tree revision to
   * mount.
   * The method is thread-safe and can be called from any thread.
   * However, a consumer should always call it on the same thread (e.g. on the
   * main thread) or ensure sequentiality of mount transactions separately.
   */
  std::optional<MountingTransaction> pullTransaction() const;

  /*
   * Indicates if there are transactions waiting to be consumed and mounted on
   * the host platform. This can be useful to determine if side-effects of
   * mounting can be expected after some operations (like IntersectionObserver
   * initial paint notifications).
   */
  bool hasPendingTransactions() const;

  /*
   * Blocks the current thread until a new mounting transaction is available or
   * after the specified `timeout` duration.
   * Returns `false` if a timeout occurred before a new transaction available.
   * Call `pullTransaction` right after the method to retrieve the transaction.
   * Similarly to `pullTransaction` this method is thread-safe but the consumer
   * should call it on the same thread (e.g. on the main thread) or ensure
   * sequentiality of mount transactions separately.
   */
  bool waitForTransaction(std::chrono::duration<double> timeout) const;

  const TelemetryController& getTelemetryController() const;

  const ShadowTreeRevision& getBaseRevision() const;

  /*
   * Methods from this section are meant to be used by
   * `MountingOverrideDelegate` only.
   */
 public:
  void updateBaseRevision(const ShadowTreeRevision& baseRevision) const;
  void resetLatestRevision() const;

  void setMountingOverrideDelegate(
      std::weak_ptr<const MountingOverrideDelegate> delegate) const;

  /*
   * Methods from this section are meant to be used by `ShadowTree` only.
   */
 private:
  friend class ShadowTree;

  void push(ShadowTreeRevision revision) const;

  /*
   * Revokes the last pushed `ShadowTreeRevision`.
   * Generating a `MountingTransaction` requires some resources which the
   * `MountingCoordinator` does not own (e.g. `ComponentDescriptor`s). Revoking
   * committed revisions allows the owner (a Shadow Tree) to make sure that
   * those resources will not be accessed (e.g. by the Mounting Layer).
   */
  void revoke() const;

 private:
  const SurfaceId surfaceId_;

  mutable std::mutex mutex_;
  mutable ShadowTreeRevision baseRevision_;
  mutable std::optional<ShadowTreeRevision> lastRevision_{};
  mutable MountingTransaction::Number number_{0};
  mutable std::condition_variable signal_;
  mutable std::weak_ptr<const MountingOverrideDelegate>
      mountingOverrideDelegate_;

  TelemetryController telemetryController_;

#ifdef RN_SHADOW_TREE_INTROSPECTION
  mutable StubViewTree stubViewTree_; // Protected by `mutex_`.
#endif
};

} // namespace facebook::react
