package com.swmansion.reanimated.reflection;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;

import java.util.ArrayList;

public class WritableCollectionResolver {

    private WritableCollection mCollection;
    private ReadableType mType = ReadableType.Null;

    WritableCollectionResolver(WritableCollection collection) {
        mCollection = collection;
    }

    int size() {
        ReadableMapKeySetIterator keySetIterator = mCollection.getMap().keySetIterator();
        String key;
        int size = 0;
        Log.d("Invoke", "collection: ");

        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            Log.d("Invoke", "size:iterator " + key);

            if (WritableArrayResolver.isIndex(key)) {
                size = Math.max(size, Integer.valueOf(key) + 1);
            }
        }

        return size;
    }

    @NonNull
    ArrayList<Object> toArrayList() {
        ArrayList<Object> list = new ArrayList<>();
        ReadableMapKeySetIterator keySetIterator = mCollection.getMap().keySetIterator();
        String key;
        int index;

        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            if (WritableArrayResolver.isIndex(key)) {
                index = Integer.valueOf(key);
                list.ensureCapacity(index + 1);
                while (list.size() <= index) {
                    list.add(null);
                }
                list.set(index, new ReanimatedDynamic(mCollection.getMap().getDynamic(key)).value());
            }
        }

        return list;
    }

    String resolveKey(String name) {
        if (WritableArrayResolver.isIndex(name)) {
            return resolveKey(Integer.valueOf(name));
        } else {
            if (mType == ReadableType.Array) {
                throw new JSApplicationCausedNativeException("Ambiguous collection type");
            }
            mType = ReadableType.Map;
            return name;
        }
    }

    String resolveKey(int index) {
        if (mType == ReadableType.Map) {
            throw new JSApplicationCausedNativeException("Ambiguous collection type");
        }
        mType = ReadableType.Array;
        return String.valueOf(index < 0 ? size() + index : index);
    }

    String nextIndex() {
        return String.valueOf(size());
    }

    ReadableType getType() {
        return mType;
    }

    boolean isArray() {
        return mType == ReadableType.Array;
    }
}
