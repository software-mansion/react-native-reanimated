Fix exiting Layout Animations leaking their views on Android under the mounting coordinator pull model, where the structural cleanup of a finished animation was never flushed.
