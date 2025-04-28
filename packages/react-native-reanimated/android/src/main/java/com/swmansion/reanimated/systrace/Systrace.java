package com.swmansion.reanimated.systrace;

import androidx.tracing.Trace;

/**
 * A stripped copy of Systrace from React Native to suppor profiling of Reanimated.
 */
public class Systrace {

  public static final long TRACE_TAG_REACT_JAVA_BRIDGE = 0L;
  
  public static void beginSection(long tag, final String sectionName) {
    Trace.beginSection(sectionName);
  }

  public static void endSection(long tag) {
    Trace.endSection();
  }
}