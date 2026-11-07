Start animations on the first requestAnimationFrame timestamp when outside a frame flush, so the first step cannot see a negative elapsed time on web.
