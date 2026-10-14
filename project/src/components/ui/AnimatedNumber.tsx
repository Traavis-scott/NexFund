import { useEffect, useRef } from 'react';
import { useSpring, motion } from 'framer-motion';

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
  const previousValue = useRef(value);
  
  const spring = useSpring(previousValue.current, {
    from: previousValue.current,
    to: value,
    velocity: 300,
    stiffness: 100,
    damping: 30,
  });

  useEffect(() => {
    previousValue.current = value;
  }, [value]);

  return (
    <motion.span>
      {spring.to(val => `${prefix}${val.toFixed(precision)}${suffix}`)}
    </motion.span>
  );
}