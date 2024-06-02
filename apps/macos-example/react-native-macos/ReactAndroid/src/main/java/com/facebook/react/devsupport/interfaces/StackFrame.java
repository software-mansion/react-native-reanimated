/*
 * Copyright (c) Meta Platforms, Inc. and affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

package com.facebook.react.devsupport.interfaces;

import org.json.JSONObject;

/** Represents a generic entry in a stack trace, be it originally from JS or Java. */
public interface StackFrame {
  /**
   * Get the file this stack frame points to.
   *
   * <p>JS traces return the full path to the file here, while Java traces only return the file name
   * (the path is not known).
   */
  public String getFile();

  /** Get the name of the method this frame points to. */
  public String getMethod();

  /** Get the line number this frame points to in the file returned by {@link #getFile()}. */
  public int getLine();

  /** Get the column this frame points to in the file returned by {@link #getFile()}. */
  public int getColumn();

  /**
   * Get just the name of the file this frame points to.
   *
   * <p>For JS traces this is different from {@link #getFile()} in that it only returns the file
   * name, not the full path. For Java traces there is no difference.
   */
  public String getFileName();

  /** Whether this frame is collapsed. */
  public boolean isCollapsed();

  /** Convert the stack frame to a JSON representation. */
  public JSONObject toJSON();
}
