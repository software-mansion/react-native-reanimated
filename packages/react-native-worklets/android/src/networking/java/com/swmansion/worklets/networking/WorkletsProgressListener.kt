/**
* Based on ProgressListener.kt from React Native 
*/

package com.swmansion.worklets.networking

public fun interface WorkletsProgressListener {
  public fun onProgress(bytesWritten: Long, contentLength: Long, done: Boolean)
}
