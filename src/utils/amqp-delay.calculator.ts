export type CalculateDelayParams = {
  currentAttempt: number;
  delay: number;
  maxDelay: number;
};

export type DelayCalculator = (args: CalculateDelayParams) => number;

export const doubleWithEveryAttemptDelayCalculator: DelayCalculator = ({
  currentAttempt,
  delay,
  maxDelay,
}) => {
  const calculatedDelay = delay * Math.pow(2, currentAttempt - 1);
  return calculatedDelay > maxDelay ? maxDelay : calculatedDelay;
};

export const constantWithEveryAttemptDelayCalculator: DelayCalculator = ({
  delay,
}) => delay;
