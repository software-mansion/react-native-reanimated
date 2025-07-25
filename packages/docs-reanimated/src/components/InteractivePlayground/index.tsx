import 'react-native-gesture-handler';
import React, { Dispatch } from 'react';
import styles from './styles.module.css';

import BrowserOnly from '@docusaurus/BrowserOnly';
import CodeBlock from '@theme/CodeBlock';
import { useReducedMotion } from 'react-native-reanimated';
import ReducedMotionWarning from '../ReducedMotionWarning';

import useClampPlayground from './useClampPlayground';
import useSpringPlayground from './useSpringPlayground';
import useTimingPlayground from './useTimingPlayground';
import useEnteringExitingPlayground from './useEnteringExitingAnimationPlayground';
import useRepeatPlayground from './useRepeatPlayground';
import useInterpolateColorPlayground from './useInterpolateColorPlayground';
import useAnimatedSensorPlayground from './useAnimatedSensorPlayground';
import useDecayPlayground from './useDecayPlayground';

import Reset from '@site/static/img/reset.svg';
import ResetDark from '@site/static/img/reset-dark.svg';
import AnimableIcon, { Animation } from '@site/src/components/AnimableIcon';
import {
  Checkbox,
  FormControl,
  MenuItem,
  Select,
  Slider,
  TextField,
} from '@mui/material';

export {
  useClampPlayground,
  useSpringPlayground,
  useTimingPlayground,
  useRepeatPlayground,
  useEnteringExitingPlayground,
  useInterpolateColorPlayground,
  useAnimatedSensorPlayground,
  useDecayPlayground,
};

interface InteractivePlaygroundProps {
  usePlayground: () => {
    example: React.FC<{ width?: number }>;
    props?: Record<string, any>;
    code: string;
    controls: string;
    resetOptions: () => {};
    additionalComponents?: { section; chart };
  };
}

export default function InteractivePlayground(
  props: InteractivePlaygroundProps
) {
  const [key, setKey] = React.useState(0);
  const [width, setWidth] = React.useState<number | null>(null);

  const interactiveExampleRef = React.useRef<HTMLDivElement>(null);

  const {
    example: Example,
    props: exampleProps,
    code,
    controls,
    resetOptions,
    additionalComponents,
  } = props.usePlayground();

  const resetExample = () => {
    if (interactiveExampleRef.current) {
      setWidth(interactiveExampleRef.current.offsetWidth);
    }
    setKey(key + 1);
    resetOptions();
  };

  const prefersReducedMotion = useReducedMotion();

  React.useEffect(() => {
    if (interactiveExampleRef.current) {
      setWidth(interactiveExampleRef.current.offsetWidth);
    }
  }, [interactiveExampleRef.current]);

  return (
    <BrowserOnly fallback={<div>Loading...</div>}>
      {() => (
        <div ref={interactiveExampleRef} className={styles.container}>
          {prefersReducedMotion && <ReducedMotionWarning />}
          <div className={styles.buttonContainer}>
            <AnimableIcon
              icon={<Reset />}
              iconDark={<ResetDark />}
              animation={Animation.FADE_IN_OUT}
              onClick={(actionPerformed, setActionPerformed) => {
                if (!actionPerformed) {
                  resetExample();
                  setActionPerformed(true);
                }
              }}
            />
          </div>
          <div className={styles.previewWrapper}>
            <React.Fragment key={key}>
              <Example {...exampleProps} width={width} />
            </React.Fragment>
          </div>
          {additionalComponents?.section}
          <div className={styles.wrapper}>
            <div className={styles.controls}>
              {controls}
              {additionalComponents?.chart}
            </div>
            <div className={styles.codeWrapper}>
              <CodeBlock className={styles.code} language="javascript">
                {code}
              </CodeBlock>
            </div>
          </div>
        </div>
      )}
    </BrowserOnly>
  );
}

interface RangeProps {
  min: number;
  max: number;
  step?: number;
  value: number;
  onChange: Dispatch<number>;
  disabled?: boolean;
  label: string;
}

interface DoubleRangeProps {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: [Dispatch<number>, Dispatch<number>];
  label: string;
  color?: 'yellow' | 'green';
}

const RangeStyling = {
  color: 'var(--swm-interactive-slider)', // color of the main path of slider
  '& .MuiSlider-thumb': {
    backgroundColor: 'var(--swm-interactive-slider)', //color of thumb
    transform: 'translate(-50%, -50%)',
  },
  '& .MuiSlider-rail': {
    color: 'var(--swm-interactive-slider-rail)', //color of the rail (remaining area of slider)
    opacity: 1,
  },
};

const DisabledRangeStyling = {
  color: 'var(--swm-interactive-slider)', // color of the main path of slider
  '& .MuiSlider-thumb': {
    backgroundColor: '#ccc', //color of thumb
    transform: 'translate(-50%, -50%)',
  },
  '& .MuiSlider-rail': {
    color: 'var(--swm-interactive-slider-rail)', //color of the rail (remaining area of slider)
    opacity: 1,
  },
};

const TextFieldStyling = {
  minWidth: 88,
  '& .MuiInputBase-input': {
    fontSize: 14,
    backgroundColor: 'background.default',
    color: 'text.secondary',
  },
  '& fieldset': {
    borderRadius: 0,
    borderColor: 'text.secondary',
  },
};

export function Range({
  min,
  max,
  value,
  onChange,
  disabled,
  label,
  step = 1,
}: RangeProps) {
  return (
    <>
      <div className={styles.row}>
        <label style={{ color: disabled && '#aaa' }}>{label}</label>
        <TextField
          type="number"
          hiddenLabel
          disabled={disabled}
          size="small"
          inputProps={{ min: min, max: max, step: step }}
          sx={TextFieldStyling}
          value={value}
          onChange={(e) => {
            const newValue = parseFloat(e.target.value);
            onChange(newValue > max ? max : newValue <= min ? min : newValue);
          }}
        />
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        sx={disabled ? DisabledRangeStyling : RangeStyling}
        onChange={(e: Event & { target: HTMLInputElement }) =>
          onChange(parseFloat(e.target.value))
        }
      />
    </>
  );
}

export function DoubleRange({
  min,
  max,
  value,
  onChange,
  label,
  step = 1,
  color,
}: DoubleRangeProps) {
  return (
    <>
      <div className={styles.row}>
        <label>{label}</label>
        {[0, 1].map((idx) => {
          return (
            <TextField
              type="number"
              hiddenLabel
              size="small"
              key={`${label}${idx}`}
              inputProps={{ min: min, max: max, step: step }}
              sx={TextFieldStyling}
              value={value[idx]}
              onChange={(e) => {
                const newValue = parseFloat(e.target.value);
                onChange[idx](
                  newValue > max[idx]
                    ? max[idx]
                    : newValue <= min[idx]
                    ? min[idx]
                    : newValue
                );
              }}
            />
          );
        })}
      </div>
      <Slider
        min={min}
        max={max}
        step={step}
        value={value}
        sx={RangeStyling}
        onChange={(e: Event & { target: HTMLInputElement }) => {
          onChange[0](parseFloat(e.target.value[0]));
          onChange[1](parseFloat(e.target.value[1]));
        }}
      />
    </>
  );
}

interface CheckboxProps {
  value: boolean;
  onChange: Dispatch<boolean>;
  label: string;
}

export function CheckboxOption({ value, onChange, label }: CheckboxProps) {
  return (
    <div className={styles.row}>
      <div>{label}</div>
      <Checkbox
        color="secondary"
        checked={value}
        onChange={(e) => onChange(e.target.checked)}
        disableRipple
      />
    </div>
  );
}

export function formatReduceMotion(reduceMotion: string) {
  if (reduceMotion === 'always') {
    return 'ReduceMotion.Always';
  } else if (reduceMotion === 'never') {
    return 'ReduceMotion.Never';
  }
  return 'ReduceMotion.System';
}

interface SelectProps {
  value: string;
  onChange: Dispatch<string>;
  label: string;
  options: string[];
  disabled?: boolean;
  disabledOptions?: string[];
}

const SelectStyling = {
  fontSize: 14,
  color: 'text.secondary',
  backgroundColor: 'background.default',
  borderRadius: 0,
  '& fieldset': {
    borderColor: 'text.secondary',
  },
};

export function SelectOption({
  value,
  onChange,
  label,
  options,
  disabled,
  disabledOptions,
}: SelectProps) {
  return (
    <div className={styles.row}>
      <label>{label}</label>
      <FormControl sx={{ minWidth: 85 }} size="small">
        <Select
          value={value}
          sx={SelectStyling}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}>
          {options.map((option) => (
            <MenuItem
              key={option}
              value={option}
              disabled={disabledOptions?.includes(option)}
              sx={{ color: 'text.secondary' }}>
              {option}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  );
}
