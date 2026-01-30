package com.swmansion.worklets;

import android.annotation.SuppressLint;
import android.content.res.AssetManager;
import android.os.Build;
import com.facebook.jni.HybridData;
import com.facebook.proguard.annotations.DoNotStrip;
import com.facebook.proguard.annotations.DoNotStripAny;
import java.io.IOException;
import java.io.InputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/** A wrapper around a JavaScript bundle that is backed by a native C++ object. */
@SuppressWarnings("JavaJniMissingFunction")
@SuppressLint("MissingNativeLoadLibrary")
@DoNotStripAny
public class ScriptBufferWrapper {
  public ScriptBufferWrapper(String uri, AssetManager assetManager) {
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
    var scriptUrl = new URL(url);
    HttpURLConnection connection = (HttpURLConnection) scriptUrl.openConnection();
    try {
      byte[] content;

      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        content = connection.getInputStream().readAllBytes();
      } else {
        content = readBytes(connection.getInputStream());
      }

      return new String(content, StandardCharsets.UTF_8);
    } finally {
      if (connection != null) {
        connection.disconnect();
      }
    }
  }

  /** Reads all bytes from an InputStream into a byte array for SDKs below 33. */
  private static byte[] readBytes(InputStream inputStream) throws IOException {
    final int BUFFER_SIZE = 4096;
    try {
      java.io.ByteArrayOutputStream byteBuffer = new java.io.ByteArrayOutputStream();
      byte[] buffer = new byte[BUFFER_SIZE];
      int len;
      while ((len = inputStream.read(buffer)) != -1) {
        byteBuffer.write(buffer, 0, len);
      }
      return byteBuffer.toByteArray();
    } finally {
      if (inputStream != null) {
        inputStream.close();
      }
    }
  }

  private native HybridData initHybridFromAssets(AssetManager assetManager, String assetURL);

  private native HybridData initHybridFromFile(String fileName);

  private native HybridData initHybridFromString(String script, String url);

  @DoNotStrip
  @SuppressWarnings({"unused", "FieldCanBeLocal"})
  private final HybridData mHybridData;
}
