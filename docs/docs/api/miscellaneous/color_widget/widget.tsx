import React, { useEffect, useState, useRef } from 'react';
import { HexColorPicker, HexColorInput } from 'react-colorful';
import styles from './styles.module.css';

type RGB = {
  r: number;
  g: number;
  b: number;
};

type HSV = {
  h: number;
  s: number;
  v: number;
};

const hexToRgb = (hex: string): RGB => {
  if (hex[0] === '#') hex = hex.substring(1);

  if (hex.length < 6) {
    return {
      r: parseInt(hex[0] + hex[0], 16),
      g: parseInt(hex[1] + hex[1], 16),
      b: parseInt(hex[2] + hex[2], 16),
    };
  }

  return {
    r: parseInt(hex.substring(0, 2), 16),
    g: parseInt(hex.substring(2, 4), 16),
    b: parseInt(hex.substring(4, 6), 16),
  };
};

const toLinearSpace = (c: RGB, gamma: number): RGB => {
  return {
    r: Math.pow(c.r / 255, gamma),
    g: Math.pow(c.g / 255, gamma),
    b: Math.pow(c.b / 255, gamma),
  };
};

const toGammaSpace = (c: RGB, gamma: number): RGB => {
  return {
    r: Math.round(Math.pow(c.r, 1 / gamma) * 255),
    g: Math.round(Math.pow(c.g, 1 / gamma) * 255),
    b: Math.round(Math.pow(c.b, 1 / gamma) * 255),
  };
};

const rgbInterpolation = (value: number, c1: RGB, c2: RGB, gamma: number) => {
  c1 = toLinearSpace(c1, gamma);
  c2 = toLinearSpace(c2, gamma);
  return toGammaSpace(
    {
      r: c1.r + (c2.r - c1.r) * value,
      g: c1.g + (c2.g - c1.g) * value,
      b: c1.b + (c2.b - c1.b) * value,
    },
    gamma
  );
};

const RGBtoHSV = (rgb: RGB): HSV => {
  const { r, g, b } = rgb;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const s = max === 0 ? 0 : d / max;
  const v = max / 255;

  let h;

  switch (max) {
    default:
    /* fallthrough */
    case min:
      h = 0;
      break;
    case r:
      h = g - b + d * (g < b ? 6 : 0);
      h /= 6 * d;
      break;
    case g:
      h = b - r + d * 2;
      h /= 6 * d;
      break;
    case b:
      h = r - g + d * 4;
      h /= 6 * d;
      break;
  }

  return {
    h: h,
    s: s,
    v: v,
  };
};

const HSVtoRGB = (hsv: HSV): RGB => {
  const { h, s, v } = hsv;
  let r, g, b, i, f, p, q, t;
  i = Math.floor(h * 6);
  f = h * 6 - i;
  p = v * (1 - s);
  q = v * (1 - f * s);
  t = v * (1 - (1 - f) * s);
  switch (i % 6) {
    case 0:
      (r = v), (g = t), (b = p);
      break;
    case 1:
      (r = q), (g = v), (b = p);
      break;
    case 2:
      (r = p), (g = v), (b = t);
      break;
    case 3:
      (r = p), (g = q), (b = v);
      break;
    case 4:
      (r = t), (g = p), (b = v);
      break;
    case 5:
      (r = v), (g = p), (b = q);
      break;
  }
  return {
    r: Math.round(r * 255),
    g: Math.round(g * 255),
    b: Math.round(b * 255),
  };
};

const hsvInterpolation = (
  value: number,
  c1: RGB,
  c2: RGB,
  useCorrectedHSV: boolean
) => {
  let hsv1 = RGBtoHSV(c1);
  let hsv2 = RGBtoHSV(c2);

  let h;
  let d = hsv2.h - hsv1.h;
  if (useCorrectedHSV) {
    if (hsv1.h > hsv2.h) {
      var h3 = hsv2.h;
      hsv2.h = hsv1.h;
      hsv1.h = h3;
      d = -d;
      value = 1 - value;
    }
    if (d > 0.5) {
      hsv1.h = hsv1.h + 1;
      h = (hsv1.h + value * (hsv2.h - hsv1.h)) % 1;
    }
    if (d <= 0.5) {
      h = hsv1.h + value * d;
    }
  } else {
    h = hsv1.h + value * d;
  }

  return HSVtoRGB({
    h,
    s: hsv1.s + (hsv2.s - hsv1.s) * value,
    v: hsv1.v + (hsv2.v - hsv1.v) * value,
  });
};

const rgbToString = (color: RGB): string => {
  return `rgb(${color.r}, ${color.g}, ${color.b})`;
};

const animationDuration = 1000;

const ColorWidget = ({
  color1,
  color2,
  interpolateFunction,
}: {
  color1: RGB;
  color2: RGB;
  interpolateFunction: (c1: RGB, c2: RGB, p: number) => RGB;
}) => {
  const animatedBoxRef = useRef<HTMLDivElement>();
  const frame = useRef(0);
  const firstFrameTime = useRef(performance.now());

  const [animatedBoxColor, setAnimatedBoxColor] = useState(color1);

  useEffect(() => {
    if (animatedBoxColor == color1) {
      return;
    }
    firstFrameTime.current = performance.now();
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [animatedBoxColor]);

  useEffect(() => {
    nextAnimationFrameHandler(0);
  }, [color1, color2, animatedBoxRef]);

  const animate = (now) => {
    let timeFraction = (now - firstFrameTime.current) / animationDuration;
    if (timeFraction > 1) {
      timeFraction = 1;
    }

    nextAnimationFrameHandler(timeFraction);
    if (timeFraction != 1) frame.current = requestAnimationFrame(animate);
  };

  const nextAnimationFrameHandler = (progress) => {
    const box = animatedBoxRef.current;
    if (box) {
      box.style.backgroundColor = rgbToString(
        interpolateFunction(color1, color2, progress)
      );
    }
  };

  return (
    <div>
      <div className={styles.row}>
        {new Array(11)
          .fill(null)
          .map((_, i) => i / 10)
          .map((p) => (
            <div
              key={'' + p}
              className={styles.smallBox}
              style={{
                backgroundColor: rgbToString(
                  interpolateFunction(color1, color2, p)
                ),
              }}
            />
          ))}
      </div>
      <div className={`${styles.row} ${styles.gap} ${styles.marginTop}`}>
        <div className={styles.animatedBox} ref={animatedBoxRef} />
        <button type="button" onClick={() => setAnimatedBoxColor(color2)}>
          Start animation!
        </button>
      </div>
    </div>
  );
};

export const ColorWidgets = () => {
  const [color1, setColor1] = useState('#ff0000');
  const [color2, setColor2] = useState('#00ff00');
  const [gamma, setGamma] = useState(2.2);

  const handleOnGammaChange = (event) => {
    const gamma = event.target.value;
    setGamma(parseFloat(gamma));
  };

  const [useCorrectedHSV, setUseCorrectedHSV] = useState(true);

  return (
    <div>
      <h3>Interpolate:</h3>
      <div className={`${styles.row} ${styles.gap}`}>
        <div>
          <h4>
            From: <HexColorInput color={color1} onChange={setColor1} prefixed />
          </h4>
          <HexColorPicker color={color1} onChange={setColor1} />
        </div>

        <div>
          <h4>
            To: <HexColorInput color={color2} onChange={setColor2} prefixed />
          </h4>
          <HexColorPicker color={color2} onChange={setColor2} />
        </div>
      </div>

      <h3 className={styles.marginTop}>RGB colorspace:</h3>
      <h4>
        Gamma:{' '}
        <input type="number" value={gamma} onChange={handleOnGammaChange} />{' '}
      </h4>
      <ColorWidget
        color1={hexToRgb(color1)}
        color2={hexToRgb(color2)}
        interpolateFunction={(c1, c2, p) => rgbInterpolation(p, c1, c2, gamma)}
      />

      <h3 className={styles.marginTop}>HSV colorspace:</h3>
      <label>
        <input
          type="checkbox"
          checked={useCorrectedHSV}
          onChange={() => setUseCorrectedHSV(!useCorrectedHSV)}
        />
        Use corrected HSV
      </label>
      <ColorWidget
        color1={hexToRgb(color1)}
        color2={hexToRgb(color2)}
        interpolateFunction={(c1, c2, p) =>
          hsvInterpolation(p, c1, c2, useCorrectedHSV)
        }
      />
    </div>
  );
};
