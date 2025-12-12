package com.swmansion.worklets;

import android.annotation.SuppressLint;
import android.content.res.AssetManager;
import android.os.Build;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.proguard.annotations.DoNotStripAny;
import java.io.IOException;

/** A wrapper around a JavaScript bundle that is backed by a native C++ object. */
@SuppressWarnings("JavaJniMissingFunction")
@SuppressLint("MissingNativeLoadLibrary")
@DoNotStripAny
public class ScriptWrapper {
  public ScriptWrapper(String uri, AssetManager assetManager) {
    String filePrefix = "file://";
    String assetsPrefix = "assets://";

    if (uri.startsWith(filePrefix)) {
      String fileName = uri.substring(filePrefix.length());
      mHybridData = initHybridFromFile(fileName);
    } else if (uri.startsWith(assetsPrefix)) {
      String assetURL = uri.substring(assetsPrefix.length());
      mHybridData = initHybridFromAssets(assetManager, assetURL);
    } else {
      String scriptContent;
      try {
        scriptContent = downloadScript(uri);
      } catch (IOException e) {
        throw new RuntimeException(e);
      }
      mHybridData = initHybridFromString(scriptContent, uri);
    }
  }

  private static String downloadScript(String url) throws IOException {
    var connection = (java.net.HttpURLConnection) new java.net.URL(url).openConnection();
    byte[] content = null;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      content = connection.getInputStream().readAllBytes();
    }
    return new String(content, java.nio.charset.StandardCharsets.UTF_8);
  }

  private native HybridData initHybridFromAssets(AssetManager assetManager, String assetURL);

  private native HybridData initHybridFromFile(String fileName);

  private native HybridData initHybridFromString(String script, String url);

  @DoNotStrip
  @SuppressWarnings({"unused", "FieldCanBeLocal"})
  private final HybridData mHybridData;
}
