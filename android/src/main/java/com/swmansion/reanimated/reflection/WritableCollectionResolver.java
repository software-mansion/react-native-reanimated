package com.swmansion.reanimated.reflection;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableMap;

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
        int n = 0;
        Log.d("Invoke", "collection: ");

        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            n++;
            Log.d("Invoke", "size:iterator " + key);

            if (WritableArrayResolver.isIndex(key)) {
                size = Math.max(size, Integer.valueOf(key) + 1);
            }
        }

        assertCondition((size > 0 && mType == ReadableType.Map) || (size != n && mType == ReadableType.Array), "Ambiguous collection type");
        mType = size > 0 ? ReadableType.Array : ReadableType.Map;
        return size;
    }

    @NonNull
    ArrayList<Object> toArrayList() {
        ArrayList<Object> list = new ArrayList<>();
        WritableMap map = mCollection.getMap();
        ReadableMapKeySetIterator keySetIterator = map.keySetIterator();
        String key;
        int index;

        Log.d("Invoke", "toArrayList: map: " + map);

        while (keySetIterator.hasNextKey()) {
            key = keySetIterator.nextKey();
            if (WritableArrayResolver.isIndex(key)) {
                index = Integer.valueOf(key);
                list.ensureCapacity(index + 1);
                while (list.size() <= index) {
                    list.add(null);
                }
                list.set(index, new ReanimatedDynamic(map.getDynamic(key)).value());
            }
        }


        return list;
    }

    String resolveKey(String name) {
        if (WritableArrayResolver.isIndex(name)) {
            return resolveKey(Integer.valueOf(name));
        } else {
            assertType(mType == ReadableType.Map, name);
            mType = ReadableType.Map;
            return name;
        }
    }

    private String resolveKey(int index) {
        assertType(mType == ReadableType.Map, index);
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

    private void assertType(boolean condition, Object key) {
        assertCondition(condition, String.format("Ambiguous collection type: existing %s, next key %s", mCollection.getMap(), key));
    }

    private void assertCondition(boolean condition, String message) {
        if (condition) {
            throw new JSApplicationCausedNativeException(message);
        }
    }
}
