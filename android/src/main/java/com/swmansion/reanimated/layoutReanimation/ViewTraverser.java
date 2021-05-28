package com.swmansion.reanimated.layoutReanimation;

import android.view.View;
import android.view.ViewGroup;

interface TraversingLambda {
    public void exec(View view);
}

public class ViewTraverser {

    static void traverse(View view, TraversingLambda lambda) {
        if (!(view instanceof AnimatedRoot)) {
            return;
        }
        AnimatedRoot root = (AnimatedRoot)view;
        int depth = (int)1e9;
        internalTraverse(root, lambda, depth, false);
    }

    static void internalTraverse(View view, TraversingLambda lambda, int depth, boolean shouldSkipAnimationRoots) {
        if ((view instanceof AnimatedRoot) && shouldSkipAnimationRoots) {
            return;
        }

        if (depth == 0) {
            return;
        }

        if (view instanceof ViewGroup) {
            ViewGroup viewGroup = (ViewGroup)view;
            for  (int i = 0; i < viewGroup.getChildCount(); ++i) {
                internalTraverse(viewGroup.getChildAt(i), lambda,depth - 1, false);
            }
        }

        lambda.exec(view);
    }
}
