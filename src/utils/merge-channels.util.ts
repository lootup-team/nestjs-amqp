import { AmqpModuleOptions } from '../amqp.factory';

type Channels = AmqpModuleOptions['channels'];

export const mergeChannels = (
  options: AmqpModuleOptions,
  channelsInferedFromDecorators: Channels,
) => {
  const { channels: channelsFromOptions = [] } = options;
  const alreadySetupChannel = {};
  const mergedChannels: Channels = [];
  const appendChannel = ({
    name,
    default: isDefault,
    prefetchCount,
  }: Channels[number]) => {
    if (!alreadySetupChannel[name]) {
      mergedChannels.push({ name, default: isDefault, prefetchCount });
      alreadySetupChannel[name] = true;
    }
  };
  channelsFromOptions.forEach(appendChannel);
  channelsInferedFromDecorators.forEach(appendChannel);
  return mergedChannels;
};
