import React, { ReactNode } from "react";
// eslint-disable-next-line react-native/split-platform-components
import { Dimensions, StyleSheet } from "react-native";
import Animated from "react-native-reanimated";
import Svg, { Path } from "react-native-svg";
import MaskedView from "@react-native-community/masked-view";
import { useSideWidth, useWaveHorR, useWaveVertRadius } from "./WeaveHelpers";

import { close, curveTo, lineTo, moveTo } from "./SVGHelpers";

const { width, height } = Dimensions.get("window");
const AnimatedPath = Animated.createAnimatedComponent(Path);
const { sub, add, multiply, concat } = Animated;

export default ({
  centerY,
  progress,
  isBack,
  children
}: any) => {
  const horRadius = useWaveHorR(progress, isBack);
  const vertRadius = useWaveVertRadius(progress);
  const sideWidth = useSideWidth(progress);

  const curveStartY = add(centerY, vertRadius);
  const maskWidth = sub(width, sideWidth);
  const commands: Animated.Node<string>[] = [];
  moveTo(commands, sub(maskWidth, sideWidth), 0);
  lineTo(commands, 0, 0);
  lineTo(commands, 0, height);
  lineTo(commands, maskWidth, height);
  lineTo(commands, maskWidth, curveStartY);
  curveTo(commands, {
    to: {
      x: sub(maskWidth, multiply(horRadius, 0.1561501458)),
      y: sub(curveStartY, multiply(vertRadius, 0.3322374268))
    },
    c1: {
      x: maskWidth,
      y: sub(curveStartY, multiply(vertRadius, 0.1346194756))
    },
    c2: {
      x: sub(maskWidth, multiply(horRadius, 0.05341339583)),
      y: sub(curveStartY, multiply(vertRadius, 0.2412779634))
    }
  });
  curveTo(commands, {
    to: {
      x: sub(maskWidth, multiply(horRadius, 0.5012484792)),
      y: sub(curveStartY, multiply(vertRadius, 0.5350576951))
    },
    c1: {
      x: sub(maskWidth, multiply(horRadius, 0.2361659167)),
      y: sub(curveStartY, multiply(vertRadius, 0.4030805244))
    },
    c2: {
      x: sub(maskWidth, multiply(horRadius, 0.3305285625)),
      y: sub(curveStartY, multiply(vertRadius, 0.4561193293))
    }
  });
  curveTo(commands, {
    to: {
      x: sub(maskWidth, multiply(horRadius, 0.574934875)),
      y: sub(curveStartY, multiply(vertRadius, 0.5689655122))
    },
    c1: {
      x: sub(maskWidth, multiply(horRadius, 0.515878125)),
      y: sub(curveStartY, multiply(vertRadius, 0.5418222317))
    },
    c2: {
      x: sub(maskWidth, multiply(horRadius, 0.5664134792)),
      y: sub(curveStartY, multiply(vertRadius, 0.5650349878))
    }
  });
  curveTo(commands, {
    to: {
      x: sub(maskWidth, multiply(horRadius, 0.8774032292)),
      y: sub(curveStartY, multiply(vertRadius, 0.7399037439))
    },
    c1: {
      x: sub(maskWidth, multiply(horRadius, 0.7283715208)),
      y: sub(curveStartY, multiply(vertRadius, 0.6397387195))
    },
    c2: {
      x: sub(maskWidth, multiply(horRadius, 0.8086618958)),
      y: sub(curveStartY, multiply(vertRadius, 0.6833456585))
    }
  });
  curveTo(commands, {
    to: {
      x: sub(maskWidth, horRadius),
      y: sub(curveStartY, vertRadius)
    },
    c1: {
      x: sub(maskWidth, multiply(horRadius, 0.9653464583)),
      y: sub(curveStartY, multiply(vertRadius, 0.8122605122))
    },
    c2: {
      x: sub(maskWidth, horRadius),
      y: sub(curveStartY, multiply(vertRadius, 0.8936183659))
    }
  });
  curveTo(commands, {
    to: {
      x: sub(maskWidth, multiply(horRadius, 0.8608411667)),
      y: sub(curveStartY, multiply(vertRadius, 1.270484439))
    },
    c1: {
      x: sub(maskWidth, horRadius),
      y: sub(curveStartY, multiply(vertRadius, 1.100142878))
    },
    c2: {
      x: sub(maskWidth, multiply(horRadius, 0.9595746667)),
      y: sub(curveStartY, multiply(vertRadius, 1.1887991951))
    }
  });
  curveTo(commands, {
    to: {
      x: sub(maskWidth, multiply(horRadius, 0.5291125625)),
      y: sub(curveStartY, multiply(vertRadius, 1.4665102805))
    },
    c1: {
      x: sub(maskWidth, multiply(horRadius, 0.7852123333)),
      y: sub(curveStartY, multiply(vertRadius, 1.3330544756))
    },
    c2: {
      x: sub(maskWidth, multiply(horRadius, 0.703382125)),
      y: sub(curveStartY, multiply(vertRadius, 1.3795848049))
    }
  });
  curveTo(commands, {
    to: {
      x: sub(maskWidth, multiply(horRadius, 0.5015305417)),
      y: sub(curveStartY, multiply(vertRadius, 1.4802616098))
    },
    c1: {
      x: sub(maskWidth, multiply(horRadius, 0.5241858333)),
      y: sub(curveStartY, multiply(vertRadius, 1.4689677195))
    },
    c2: {
      x: sub(maskWidth, multiply(horRadius, 0.505739125)),
      y: sub(curveStartY, multiply(vertRadius, 1.4781625854))
    }
  });
  curveTo(commands, {
    to: {
      x: sub(maskWidth, multiply(horRadius, 0.1541165417)),
      y: sub(curveStartY, multiply(vertRadius, 1.687403))
    },
    c1: {
      x: sub(maskWidth, multiply(horRadius, 0.3187486042)),
      y: sub(curveStartY, multiply(vertRadius, 1.5714239024))
    },
    c2: {
      x: sub(maskWidth, multiply(horRadius, 0.2332057083)),
      y: sub(curveStartY, multiply(vertRadius, 1.6204116463))
    }
  });
  curveTo(commands, {
    to: {
      x: maskWidth,
      y: sub(curveStartY, multiply(vertRadius, 2))
    },
    c1: {
      x: sub(maskWidth, multiply(horRadius, 0.0509933125)),
      y: sub(curveStartY, multiply(vertRadius, 1.774752061))
    },
    c2: {
      x: maskWidth,
      y: sub(curveStartY, multiply(vertRadius, 1.8709256829))
    }
  });
  lineTo(commands, maskWidth, 0);
  close(commands);
  const d = commands.reduce((acc, c) => concat(acc, c));
  const maskElement = (
    <Svg {...{ width, height }}>
      <AnimatedPath {...{ d }} fill="black" />
    </Svg>
  );
  return (
    <MaskedView style={StyleSheet.absoluteFill} maskElement={maskElement}>
      {children}
    </MaskedView>
  );
};
