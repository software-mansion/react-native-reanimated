Pause Reanimated commits only on the surface whose React commit is in flight, so a React commit of one surface no longer freezes animations on other surfaces or drops their last animation frame.
