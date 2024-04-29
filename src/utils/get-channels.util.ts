import { AmqpModuleOptions } from '../amqp.factory';

export const getChannels = (options: AmqpModuleOptions) => {
  return (options.channels ?? []).reduce(
    (acc, { name, ...channelConfig }) => ({
      ...acc,
      [name]: channelConfig,
    }),
    {},
  );
};
