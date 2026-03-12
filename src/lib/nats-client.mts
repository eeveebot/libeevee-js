'use strict';

import { EventEmitter } from "events";
import * as crypto from "crypto";
import * as Nats from "nats";
import { log } from "./log.mjs";

interface NatsConfig {
  natsHost: string;
  natsToken: string;
}

interface MessageCallback {
  (subject: string, message: Nats.Msg): void;
}

export class NatsClient extends EventEmitter {
  name = "";
  instanceUUID = "";
  instanceIdent = "";

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
    try {
      if (!this.natsHost || !this.natsToken) {
        throw new Error("NATS host and token must be configured");
      }
      
      this.nats = await Nats.connect({
        servers: this.natsHost,
        token: this.natsToken,
      });
      log.info(`connected to NATS at ${this.nats.getServer()}`, {
        producer: "natsClient",
      });
    } catch (err: unknown) {
      const error = err as Error;
      log.error(error.message, { producer: "natsClient" });
      if (error.message === "CONNECTION_REFUSED") {
        log.error("E_CONNECTION_REFUSED from NATS, will retry", {
          producer: "natsClient",
        });
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await this.connect();
      } else {
        throw err;
      }
    }
  }

  async subscribe(subject: string, callback?: MessageCallback): Promise<string | boolean> {
    if (this.nats) {
      const sub = this.nats.subscribe(subject);
      this.subjects.push(sub);
      (async () => {
        for await (const message of sub) {
          log.info(
            `[${message.subject}][${sub.getProcessed()}]: ${message.string()}`,
            { producer: "natsClient" }
          );
          if (typeof callback == "function") {
            callback(subject, message);
          }
        }
        log.info("subscription closed", { producer: "natsClient" });
      })();
      return subject;
    } else {
      log.info("nats.subscribe() called before initialized", {
        producer: "natsClient",
      });
      return false;
    }
  }

  async publish(subject: string, message: Uint8Array | string): Promise<boolean> {
    if (this.nats) {
      this.nats.publish(subject, message);
      return true;
    } else {
      log.info("nats.publish() called before initialized", {
        producer: "natsClient",
      });
      return false;
    }
  }

  async drain(): Promise<void> {
    if (this.nats) {
      await this.nats.drain();
    }
  }
}