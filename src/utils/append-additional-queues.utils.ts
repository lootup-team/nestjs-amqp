import { AmqpModuleOptions } from '../amqp.factory';
import { formatDLQ } from './format-dlq.util';

export const appendAdditionalQueues = (
  options: AmqpModuleOptions,
  queuesInferedFromDecorators: Set<string>,
) => {
  const { queues = [] } = options;
  const alreadySetupQueues = {};

  queues.forEach(({ name }) => {
    queues.push({ name: formatDLQ(name) });
    alreadySetupQueues[name] = true;
  });
  queuesInferedFromDecorators.forEach((name) => {
    if (!alreadySetupQueues[name]) {
      queues.push({ name: formatDLQ(name) });
    }
  });
};
