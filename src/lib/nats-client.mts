'use strict';

import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import * as Nats from 'nats';
import { log } from './log.mjs';

interface NatsConfig {
  natsHost: string;
  natsToken: string;
}

interface MessageCallback {
  (subject: string, message: Nats.Msg): void;
}

export class NatsClient extends EventEmitter {
  name = '';
  instanceUUID = '';
  instanceIdent = '';

  subjects: Nats.Subscription[] = [];

  natsHost: string | null = null;
  natsToken: string | null = null;

  sc = Nats.StringCodec();
  nats: Nats.NatsConnection | null = null;

  constructor(config: NatsConfig) {
    super();
    this.instanceUUID = crypto.randomUUID();
    this.natsHost = config.natsHost;
    this.natsToken = config.natsToken;
  }

  async connect(): Promise<void> {
    const maxRetries = 1000;
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (!this.natsHost || !this.natsToken) {
          throw new Error('NATS host and token must be configured');
        }

        this.nats = await Nats.connect({
          servers: this.natsHost,
          token: this.natsToken,
        });
        log.info(`connected to NATS at ${this.nats.getServer()}`, {
          producer: 'natsClient',
        });
        return;
      } catch (err: unknown) {
        const error = err as Error;
        log.error(error.message, { producer: 'natsClient' });
        if (error.message === 'CONNECTION_REFUSED') {
          log.error(`E_CONNECTION_REFUSED from NATS, retry ${attempt + 1}/${maxRetries}`, {
            producer: 'natsClient',
          });
          await new Promise((resolve) => setTimeout(resolve, 2500));
          continue;
        } else {
          throw err;
        }
      }
    }
    throw new Error(`Failed to connect to NATS after ${maxRetries} retries`);
  }

  async subscribe(
    subject: string,
    callback?: MessageCallback
  ): Promise<Nats.Subscription | false> {
    if (this.nats) {
      const sub = this.nats.subscribe(subject);
      this.subjects.push(sub);
      (async () => {
        for await (const message of sub) {
          log.info(
            `[${message.subject}][${sub.getProcessed()}]: ${message.string()}`,
            { producer: 'natsClient' }
          );
          if (typeof callback == 'function') {
            callback(subject, message);
          }
        }
        log.info('subscription closed', { producer: 'natsClient' });
      })();
      return sub;
    } else {
      log.warn('nats.subscribe() called before initialized', {
        producer: 'natsClient',
      });
      return false;
    }
  }

  /**
   * Unsubscribe a specific subscription.
   * Removes it from the internal tracking array and calls unsubscribe.
   * Safe to call multiple times — checks isClosed() first.
   */
  unsubscribe(sub: Nats.Subscription): void {
    const index = this.subjects.indexOf(sub);
    if (index !== -1) {
      this.subjects.splice(index, 1);
    }
    if (!sub.isClosed()) {
      sub.unsubscribe();
    }
  }

  async publish(
    subject: string,
    message: Uint8Array | string
  ): Promise<boolean> {
    if (this.nats) {
      this.nats.publish(subject, message);
      return true;
    } else {
      log.warn('nats.publish() called before initialized', {
        producer: 'natsClient',
      });
      return false;
    }
  }

  async drain(): Promise<void> {
    for (const sub of this.subjects) {
      sub.unsubscribe();
    }
    this.subjects = [];
    if (this.nats) {
      await this.nats.drain();
    }
  }

  /**
   * Returns true if the NATS connection is closed or was never established.
   */
  isClosed(): boolean {
    return !this.nats || this.nats.isClosed();
  }
}
