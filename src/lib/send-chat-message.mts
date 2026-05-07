'use strict';

import { NatsClient } from './nats-client.mjs';
import { ModuleMetrics } from './create-module-metrics.mjs';

export interface ChatMessage {
  channel: string;
  network: string;
  instance: string;
  platform: string;
  text: string;
  trace: string;
}

/**
 * Send a chat message on the outgoing topic.
 *
 * Constructs the standard message envelope and publishes to
 * `chat.message.outgoing.<platform>.<instance>.<channel>`.
 *
 * @param nats - Connected NATS client
 * @param message - Chat message fields
 * @param metrics - Optional ModuleMetrics for recording the publish
 * @param type - Message type, defaults to 'message.outgoing'
 */
export async function sendChatMessage(
  nats: InstanceType<typeof NatsClient>,
  message: ChatMessage,
  metrics?: ModuleMetrics,
  type: string = 'message.outgoing'
): Promise<void> {
  const envelope = {
    channel: message.channel,
    network: message.network,
    instance: message.instance,
    platform: message.platform,
    text: message.text,
    trace: message.trace,
    type,
  };

  const topic = `chat.message.outgoing.${message.platform}.${message.instance}.${message.channel}`;
  await nats.publish(topic, JSON.stringify(envelope));

  if (metrics) {
    metrics.recordNatsPublish('command_response');
  }
}

/**
 * Send a chat action (/me) on the outgoing topic.
 *
 * Same as sendChatMessage but with type 'action.outgoing'.
 */
export async function sendAction(
  nats: InstanceType<typeof NatsClient>,
  message: ChatMessage,
  metrics?: ModuleMetrics
): Promise<void> {
  return sendChatMessage(nats, message, metrics, 'action.outgoing');
}
