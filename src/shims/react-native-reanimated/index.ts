import { View, Text } from 'react-native';

export type SharedValue<T> = { value: T };

export const useSharedValue = <T,>(initial: T): SharedValue<T> => ({ value: initial });
export const useDerivedValue = <T,>(fn: () => T): SharedValue<T> => ({ value: fn() });
export const useAnimatedStyle = (fn: () => any) => fn() || {};
export const useAnimatedProps = (fn: () => any) => fn() || {};

export const withTiming = (toValue: any, _config?: any, cb?: (finished: boolean) => void) => {
  if (cb) setTimeout(() => cb(true), 0);
  return toValue;
};
export const withSpring = withTiming;
export const withDelay = (_delay: number, value: any) => value;
export const cancelAnimation = (_v?: any) => {};

export const Easing = { linear: (t: number) => t } as const;
export const runOnJS = (fn: any) => fn;
export const runOnUI = (fn: any) => fn;

export const Animated = { View, Text } as const;

export default {} as any;

