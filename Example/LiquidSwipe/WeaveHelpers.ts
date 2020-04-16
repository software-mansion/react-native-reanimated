import Animated, { useSharedValue, useMapper } from "react-native-reanimated";
import { Dimensions } from "react-native";

const { height, width } = Dimensions.get("window");

export const initialVertRadius = 82;
export const maxVertRadius = height * 0.9;

export const initialHorRadius = 48;
export const maxHorRadius = width * 0.8;

export const initialSideWidth = 15;

export const initialWaveCenter = height * 0.5;

export function useSideWidth(progress) {
  const sideWidth = useSharedValue(0);
  const mapper = useMapper(
    function(input, output) {
      'worklet';
      const { progress, initialSideWidth, width } = input;
      const { sideWidth } = output;
      const p1 = 0.2;
      const p2 = 0.8;

      if (progress.value <= p1) {
        sideWidth.set(initialSideWidth.value);
      } else if (progress.value >= p2) {
        sideWidth.set(width.value);
      } else {
        sideWidth.set(initialSideWidth.value + (width.value - initialSideWidth.value) * (progress.value - p1) / (p2 - p1));
      }

      this.log("progress: " + progress.value.toString() + " sideWidth: " + sideWidth.value.toString());
    }, [{ progress, initialSideWidth, width }, { sideWidth }]
  );
  mapper();
  return sideWidth;
}

export function useWaveVertRadius(progress) {
  const waveVertRadius = useSharedValue(initialVertRadius);
  const mapper = useMapper(
    function(input, output) {
      'worklet';
      const { progress, initialVertRadius, maxVertRadius } = input;
      const { waveVertRadius } = output;
      if (progress.value <= 0) {
        waveVertRadius.set(initialVertRadius.value);
      } else if (progress.value >= 0.4) {
        waveVertRadius.set(maxVertRadius.value);
      } else {
        waveVertRadius.set(initialVertRadius.value + (maxVertRadius.value - initialVertRadius.value)*(progress.value/0.4));
      }
    }, [{ progress, initialVertRadius, maxVertRadius }, { waveVertRadius }]
  );
  mapper();
  return waveVertRadius;
}

export function useWaveHorR(progress, isBack) {
  const waveHorR = useSharedValue(initialHorRadius);
  const coefs = useSharedValue([{A: maxHorRadius, B: maxHorRadius - initialHorRadius}, {A: 2 * initialHorRadius, B: initialHorRadius}]);
  const mapper = useMapper(
    function(input, output) {
      'worklet';
      const { progress, isBack, coefs, initialHorRadius } = input;
      const { waveHorR } = output;
      const p1 = 0.4;
      const r = 40;
      const m = 9.8;
      const beta = r / (2 * m);
      const k = 50;
      const omega0 = k / m;
      const omega = (-(beta ** 2) + omega0 ** 2) ** 0.5;
      const t = (progress.value - p1)/(1-p1);
      const { A, B } = coefs[isBack.value];
 
      if (progress.value <= 0) {
        waveHorR.set(initialHorRadius.value);
      } else if (progress.value >= 1) {
        waveHorR.set(0);
      } else {
        if (progress.value <= p1) {
          waveHorR.set(initialHorRadius.value + progress.value/p1 * B.value);
        } else {
          waveHorR.set(A.value * (Math.exp(t * (-beta)) * Math.cos(omega * t)));
        }
      }

    }, [{ progress, isBack, coefs, initialHorRadius}, { waveHorR }]
  );
  mapper();
  return waveHorR;
}