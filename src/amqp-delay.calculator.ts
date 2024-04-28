export type CalculateDelayParams = {
  currentAttempt: number;
  delayBetweenAttemptsInSeconds: number;
  maxDelayInSeconds: number;
};

export type DelayCalculator = (args: CalculateDelayParams) => number;

export const doubleWithEveryAttemptDelayCalculator: DelayCalculator = ({
  currentAttempt,
  delayBetweenAttemptsInSeconds,
  maxDelayInSeconds,
}) => {
  const delay = delayBetweenAttemptsInSeconds * Math.pow(2, currentAttempt - 1);
  return delay > maxDelayInSeconds ? maxDelayInSeconds : delay;
};

export const constantWithEveryAttemptDelayCalculator: DelayCalculator = ({
  delayBetweenAttemptsInSeconds,
}) => delayBetweenAttemptsInSeconds;
