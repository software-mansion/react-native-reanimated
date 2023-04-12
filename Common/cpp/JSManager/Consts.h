#pragma once

typedef enum JSCallbackType {
  SHARED_TRANSITION_PROGRESS_CALLBACK = 0,
} JSCallbackType;

typedef enum JSConfigType {
  SHARED_TRANSITION_ANIMATION_TYPE = 0,
} JSConfigType;

typedef enum SharedTransitionType {
  PROGRESS = 0,
  ANIMATION = 1,
} SharedTransitionType;
