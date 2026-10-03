Avoid pinning a live frame timestamp into `__frameTimestamp` when a batch of layout animations starts, so the timestamp does not outlive the frame.
