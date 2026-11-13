import { describe, it, expect } from 'vitest';
import { cn } from './utils';

describe('cn', () => {
  it('joins multiple class names', () => {
    expect(cn('p-4', 'text-sm')).toBe('p-4 text-sm');
  });

  it('ignores falsy values', () => {
    expect(cn('p-4', false, null, undefined, '')).toBe('p-4');
  });

  it('applies conditional classes from objects', () => {
    expect(cn({ 'font-bold': true, italic: false })).toBe('font-bold');
  });

  it('keeps the last conflicting Tailwind utility', () => {
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4');
  });

  it('returns an empty string when given no classes', () => {
    expect(cn()).toBe('');
  });
});
