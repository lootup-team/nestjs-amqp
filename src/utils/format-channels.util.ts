import { AmqpModuleOptions } from '../amqp.factory';

export const formatChannels = (channels: AmqpModuleOptions['channels']) => {
  return (channels ?? []).reduce(
    (acc, { name, ...channelConfig }) => ({
      ...acc,
      [name]: channelConfig,
    }),
    {},
  );
};
