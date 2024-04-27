export type CalculateDelayParams = {
  currentAttempt: number;
  timeBetweenAttemptsInSeconds: number;
  maxDelayInSeconds: number;
};

export type DelayCalculator = (args: CalculateDelayParams) => number;

export const doubleWithEveryAttemptDelayCalculator: DelayCalculator = ({
  currentAttempt,
  timeBetweenAttemptsInSeconds,
  maxDelayInSeconds,
}) => {
  const delay = timeBetweenAttemptsInSeconds * Math.pow(2, currentAttempt - 1);
  return delay > maxDelayInSeconds ? maxDelayInSeconds : delay;
};

export const constantWithEveryAttemptDelayCalculator: DelayCalculator = ({
  timeBetweenAttemptsInSeconds,
}) => timeBetweenAttemptsInSeconds;
