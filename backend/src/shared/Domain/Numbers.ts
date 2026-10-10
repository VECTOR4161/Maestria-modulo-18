export const round2 = (value: number): number => Math.round(value * 100) / 100;

export const sum = (values: number[]): number =>
  values.reduce((acc, value) => acc + value, 0);

export const mean = (values: number[]): number => sum(values) / values.length;
