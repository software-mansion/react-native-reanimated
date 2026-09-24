Fix an animated SVG `fillRule` sticking at `evenodd` on Android: `react-native-svg` (up to 15.15.5) never switches back to `nonzero`, so the committed value is re-applied after each commit.
