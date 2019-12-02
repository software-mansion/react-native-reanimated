package com.swmansion.reanimated.reflection;

import android.util.Log;

import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;

public class WritableCollectionResolver {

    private WritableCollection mCollection;
    private ReadableType mType = ReadableType.Null;

    WritableCollectionResolver(WritableCollection collection) {
        mCollection = collection;
        size();
    }

    int size() {
        return 0;
        /*
        ReadableMapKeySetIterator keySetIterator = mCollection.keySetIterator();
        String key;
        int size = 0;
        boolean hasKeys = false;

        Log.d("Invoke", "collection: ");

        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            Log.d("Invoke", "size: key set iterator " + key);

            hasKeys = true;
            if (WritableArrayResolver.isIndex(key)) {
                size = Math.max(size, Integer.valueOf(key) + 1);
            }
        }

        if (hasKeys && mType == ReadableType.Null) {
            mType = size > 0 ? ReadableType.Array : ReadableType.Map;
        }

        return size;

         */
    }

    String resolveKey(String name) {
        return WritableArrayResolver.isIndex(name) ? resolveKey(Integer.valueOf(name)) : name;
    }

    String resolveKey(int index) {
        return String.valueOf(index < 0 ? size() + index : index);
    }

    String nextIndex() {
        return String.valueOf(size());
    }

    ReadableType getType() {
        return mType;
    }

    boolean isArray() {
        Log.d("Invoke", "isArray: " + size());
        return mType == ReadableType.Array;
    }
}
