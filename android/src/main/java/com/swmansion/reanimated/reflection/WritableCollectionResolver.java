package com.swmansion.reanimated.reflection;

import android.util.Log;

import androidx.annotation.NonNull;

import com.facebook.react.bridge.JSApplicationCausedNativeException;
import com.facebook.react.bridge.ReadableMapKeySetIterator;
import com.facebook.react.bridge.ReadableType;
import com.facebook.react.bridge.WritableMap;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.Map;

public class WritableCollectionResolver {
/*
    private MapBuilder mCollection;
    private ReadableType mType = ReadableType.Null;

    WritableCollectionResolver(MapBuilder collection) {
        mCollection = collection;
    }

    int size() {
        ReadableMapKeySetIterator keySetIterator = mCollection.mapContext().keySetIterator();
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
        WritableMap map = mCollection.mapContext();
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

    <T extends Object> T resolveKey(T key) {
        if (WritableArrayResolver.isIndex(key)) {
            assertType(mType == ReadableType.Map, key);
            mType = ReadableType.Array;
            int index = ((int) key);
            Integer retVal = index < 0 ? size() + index : index;
            return ((T) retVal);
        } else {
            assertType(mType == ReadableType.Map, key);
            mType = ReadableType.Map;
            return key;
        }
    }

    static ArrayList<Object> inflate(HashMap<Integer, Object> context) {
        ArrayList<Object> out = new ArrayList<>();
        Iterator<Map.Entry<Integer, Object>> entryIterator = context.entrySet().iterator();
        Map.Entry<Integer, Object> entry;
        while (entryIterator.hasNext()) {
            entry = entryIterator.next();
            addArrayMember(out, entry.getKey(), entry.getValue());
        }
        return out;
    }

    static void addArrayMember(ArrayList<Object> arrayList, int index, Object value) {
        arrayList.ensureCapacity(index + 1);
        while (index >= arrayList.size()) {
            arrayList.add(null);
        }
        arrayList.set(index, value);
    }

    ReadableType getType() {
        return mType;
    }

    boolean isArray() {
        return mType == ReadableType.Array;
    }

    private void assertType(boolean condition, Object key) {
        assertCondition(condition, String.format("Ambiguous collection type: existing %s, next key %s", mCollection.mapContext(), key));
    }

    private void assertCondition(boolean condition, String message) {
        if (condition) {
            throw new JSApplicationCausedNativeException(message);
        }
    }

 */
}
