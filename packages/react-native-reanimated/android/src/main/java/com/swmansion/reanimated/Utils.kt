package com.swmansion.reanimated

import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap

object Utils {
  @JvmStatic
  fun processMapping(style: ReadableMap): Map<String, Int> {
    val iter = style.keySetIterator()
    val mapping = HashMap<String, Int>()
    while (iter.hasNextKey()) {
      val propKey = iter.nextKey()
      val nodeIndex = style.getInt(propKey)
      mapping[propKey] = nodeIndex
    }
    return mapping
  }

  @JvmStatic
  fun processIntArray(ary: ReadableArray): IntArray {
    val size = ary.size()
    val res = IntArray(size)
    for (i in 0 until size) {
      res[i] = ary.getInt(i)
    }
    return res
  }

  @JvmStatic
  fun simplifyStringNumbersList(list: String): String {
    // transforms string: '[1, 2, 3]' -> '1 2 3'
    // to make usage of std::istringstream in C++ easier
    return list.replace(",", "").replace("[", "").replace("]", "")
  }

  @JvmStatic
  fun convertToFloat(value: Any): Float {
    return when (value) {
      is Int -> value.toFloat()
      is Float -> value
      is Double -> value.toFloat()
      else -> 0f
    }
  }

  @JvmStatic
  fun combineRunnables(vararg runnables: Runnable): Runnable = Runnable {
    for (r in runnables) {
      r.run()
    }
  }
}
