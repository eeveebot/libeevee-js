import express, { Application, Request, Response } from 'express';
import { log } from './log.mjs';
import {
  httpRequestCounter,
  httpRequestDuration,
  register,
} from './metrics.mjs';
import type { NatsClient } from './nats-client.mjs';

interface HttpServerOptions {
  port?: string;
  serviceName: string;
  /**
   * Optional NATS client(s) to check connectivity in the /health endpoint.
   * If provided, the health endpoint returns 503 when any client is disconnected.
   * If omitted, the health endpoint always returns 200 (backward compatible).
   */
  natsClients?: NatsClient | NatsClient[];
}

/**
 * Setup HTTP API server with common endpoints
 */
export function setupHttpServer(options: HttpServerOptions) {
  const app: Application = express();
  const port = options.port || '9000';

  // Middleware
  app.use(express.json());

  // Request tracking middleware
  app.use((req: Request, res: Response, next: () => void) => {
    const start = Date.now();

    res.on('finish', () => {
      const duration = (Date.now() - start) / 1000; // Convert to seconds

      // Record request duration
      httpRequestDuration.observe(
        {
          module: options.serviceName,
          method: req.method,
          route: req.route?.path || req.path,
        },
        duration
      );

      // Record request count
      httpRequestCounter.inc({
        module: options.serviceName,
        method: req.method,
        route: req.route?.path || req.path,
        status_code: res.statusCode.toString(),
      });
    });

    next();
  });

  // Health check endpoint
  app.get('/health', (req: Request, res: Response) => {
    // If NATS clients were provided, check connectivity
    if (options.natsClients) {
      const clients = Array.isArray(options.natsClients)
        ? options.natsClients
        : [options.natsClients];

      const disconnected = clients.find((client) => client.isClosed());

      if (disconnected) {
        res.status(503).json({
          status: 'unhealthy',
          reason: 'NATS disconnected',
          timestamp: new Date().toISOString(),
          service: options.serviceName,
        });
        return;
      }
    }

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: options.serviceName,
    });
  });

  // Metrics endpoint
  app.get('/metrics', async (req: Request, res: Response) => {
    try {
      res.set('Content-Type', register.contentType);
      res.end(await register.metrics());
    } catch (ex) {
      log.error('Error generating metrics', {
        producer: `${options.serviceName}-http`,
        error: ex,
      });
      res.status(500).end('Error generating metrics');
    }
  });

  // Start server
  const server = app.listen(port, () => {
    log.info(`HTTP API server listening on port ${port}`, {
      producer: `${options.serviceName}-http`,
    });
  });

  // Handle server errors
  server.on('error', (err: Error) => {
    log.error('HTTP API server error', {
      producer: `${options.serviceName}-http`,
      error: err,
    });
  });

  return server;
}
