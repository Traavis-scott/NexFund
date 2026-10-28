import { useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

interface AnimatedNumberProps {
  value: number;
  precision?: number;
  prefix?: string;
  suffix?: string;
}

export function AnimatedNumber({
  value,
  precision = 1,
  prefix = '',
  suffix = ''
}: AnimatedNumberProps) {
  const motionValue = useMotionValue(value);
  const spring = useSpring(motionValue, {
    stiffness: 100,
    damping: 30,
  });
  const display = useTransform(spring, (latest: number) =>
    `${prefix}${latest.toFixed(precision)}${suffix}`
  );
  const previousValue = useRef(value);

  useEffect(() => {
    motionValue.set(value);
    previousValue.current = value;
  }, [value, motionValue]);

  return <motion.span>{display}</motion.span>;
}
