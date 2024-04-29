export type CalculateDelayParams = {
  currentAttempt: number;
  delayTime: number;
  maxDelay: number;
};

export type DelayCalculator = (args: CalculateDelayParams) => number;

export const doubleWithEveryAttemptDelayCalculator: DelayCalculator = ({
  currentAttempt,
  delayTime,
  maxDelay,
}) => {
  const delay = delayTime * Math.pow(2, currentAttempt - 1);
  return delay > maxDelay ? maxDelay : delay;
};

export const constantWithEveryAttemptDelayCalculator: DelayCalculator = ({
  delayTime,
}) => delayTime;
