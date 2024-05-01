import { AmqpModuleOptions } from '../amqp.factory';
import { formatDLQ } from './format-dlq.util';

export const mergeQueues = (
  options: AmqpModuleOptions,
  queuesInferedFromDecorators: Set<string>,
) => {
  const { queues: queuesFromOptions = [] } = options;
  const alreadySetupQueues = {};

  const mergedQueues: AmqpModuleOptions['queues'] = [];
  queuesFromOptions.forEach((args: AmqpModuleOptions['queues'][number]) => {
    mergedQueues.push(args, { name: formatDLQ(args.name) });
    alreadySetupQueues[args.name] = true;
  });
  queuesInferedFromDecorators.forEach((name) => {
    if (!alreadySetupQueues[name]) {
      mergedQueues.push({ name: formatDLQ(name) });
    }
  });
  return mergedQueues;
};
