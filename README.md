# @eeveebot/libeevee

> Common patterns and shared utilities for eevee modules.

## Install

### npmrc config

```ini
@eeveebot:registry=https://npm.pkg.github.com/
@thehonker:registry=https://npm.pkg.github.com/
```

### install

```bash
npm install @eeveebot/libeevee
```

Published to the eeveebot GitHub Packages registry.

## Quick Start

A minimal module using libeevee looks like this:

```ts
import {
  createNatsConnection,
  registerGracefulShutdown,
  createModuleMetrics,
  loadModuleConfig,
  RateLimitConfig,
  defaultRateLimit,
  initializeSystemMetrics,
  setupHttpServer,
  registerCommand,
  sendChatMessage,
  registerHelp,
  registerStatsHandlers,
  HelpEntry,
} from '@eeveebot/libeevee';

// Config
interface MyConfig { ratelimit?: RateLimitConfig }
const config = loadModuleConfig<MyConfig>({});

// Bootstrap
const natsClients = [];
registerGracefulShutdown(natsClients);
const nats = await createNatsConnection();
natsClients.push(nats);

// Metrics & HTTP
const metrics = createModuleMetrics('mymod');
initializeSystemMetrics('mymod');
setupHttpServer({ port: process.env.HTTP_API_PORT || '9000', serviceName: 'mymod' });
const moduleStartTime = Date.now();

// Register a command
const subs = await registerCommand(nats, {
  commandUUID: '...',
  commandDisplayName: 'mymod',
  regex: '^mymod\\s+',
  ratelimit: config.ratelimit || defaultRateLimit,
}, metrics);

// Handle command execution
nats.subscribe('command.execute.<uuid>', (subject, message) => {
  const data = JSON.parse(message.string());
  sendChatMessage(nats, {
    channel: data.channel,
    network: data.network,
    instance: data.instance,
    platform: data.platform,
    text: `You said: ${data.text}`,
    trace: data.trace,
  }, metrics);
});

// Help & stats
const helpSubs = await registerHelp(nats, 'mymod', [
  { command: 'mymod', descr: 'Does the thing', params: [{ param: 'text', required: true, descr: 'Text to echo' }] },
], metrics);

const statsSubs = registerStatsHandlers({ nats, moduleName: 'mymod', startTime: moduleStartTime, metrics });
```

That's it.

---

## API Reference

### Core Bootstrap

#### `createNatsConnection(options?)`

Reads `NATS_HOST` and `NATS_TOKEN` from environment, validates them, creates a `NatsClient`, and connects. Throws with a clear message on missing vars.

```ts
const nats = await createNatsConnection();
// With custom env var names:
const nats = await createNatsConnection({ hostEnvVar: 'MY_NATS_HOST', tokenEnvVar: 'MY_NATS_TOKEN' });
```

**Returns:** Connected `NatsClient` instance.

#### `registerGracefulShutdown(natsClients, cleanup?)`

Registers SIGINT/SIGTERM handlers that drain all NATS clients, run optional cleanup, then delegate to `handleSIG()` for double-signal force-exit.

```ts
const natsClients = [];
registerGracefulShutdown(natsClients);
// With DB cleanup:
registerGracefulShutdown(natsClients, async () => { if (db) db.close(); });
```

#### `loadModuleConfig<T>(defaults)`

Reads `MODULE_CONFIG_PATH` from env, parses the YAML file, returns the result. Falls back to `defaults` on missing path or parse errors.

```ts
interface MyConfig { ratelimit?: RateLimitConfig; maxRetries?: number }
const config = loadModuleConfig<MyConfig>({ maxRetries: 3 });
```

#### `setupHttpServer(options)`

Sets up an Express server for Prometheus metrics scraping and health checks.

```ts
setupHttpServer({ port: '9000', serviceName: 'mymod' });
```

**Options:**

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `port` | `string` | `'9000'` | Port for the HTTP server |
| `serviceName` | `string` | — | Service name included in health responses |
| `natsClients` | `NatsClient[]` | `[]` | NATS clients to check for connectivity |

**Health endpoint behavior:**

- `GET /health` checks connectivity of all provided `natsClients`
- Returns **200** if all clients are connected (`isClosed()` returns `false`)
- Returns **503** if any client is disconnected (`isClosed()` returns `true`)
- If `natsClients` is not provided or empty, always returns **200** (backward compatible)

```ts
// With NATS health checking:
const nats = await createNatsConnection();
setupHttpServer({ port: '9000', serviceName: 'mymod', natsClients: [nats] });
```

#### `initializeSystemMetrics(moduleName)`

Initializes the standard system metrics (uptime gauge, memory usage gauge) for the given module. Call once at startup.

---

### Metrics

#### `createModuleMetrics(moduleName)`

Factory that returns a `ModuleMetrics` object with pre-bound methods. Eliminates the need for per-module `lib/metrics.mts` files.

```ts
const metrics = createModuleMetrics('dice');
metrics.recordCommand(platform, network, channel, 'success');
metrics.recordError('parse_error');
metrics.recordProcessingTime(0.025);
metrics.recordNatsPublish('command.register');
metrics.recordNatsSubscribe(subject);
```

**ModuleMetrics methods:**

| Method | Description |
|---|---|
| `recordCommand(platform, network, channel, result)` | Increment command counter |
| `recordError(errorType)` | Increment error counter |
| `recordProcessingTime(seconds)` | Observe command processing time |
| `recordNatsPublish(messageType)` | Increment NATS publish counter |
| `recordNatsSubscribe(subject)` | Increment NATS subscribe counter |

#### Low-level Metrics

Direct access to shared Prometheus primitives — use these when `createModuleMetrics` isn't enough:

- `Counter`, `Gauge`, `Histogram` — prom-client constructors
- `register` — shared Prometheus registry
- `commandCounter`, `commandProcessingTime`, `commandErrorCounter` — pre-defined instruments
- `natsPublishCounter`, `natsSubscribeCounter` — NATS operation tracking
- `messageCounter`, `messageProcessingTime` — message-level metrics
- `connectionCounter`, `connectionGauge`, `channelCounter`, `channelGauge` — connector metrics
- `uptimeGauge`, `memoryUsageGauge` — system metrics
- `errorCounter`, `httpRequestCounter`, `httpRequestDuration` — infra metrics
- `recordMessage()`, `recordConnection()`, `recordChannel()`, `recordCommand()`, `recordCommandError()` — convenience wrappers

---

### Command & Message Helpers

#### `registerCommand(nats, options, metrics?, autoControlSub?)`

Registers a command with the router by publishing to `command.register`. By default, also subscribes to `control.registerCommands` and `control.registerCommands.<displayName>` for automatic re-registration.

```ts
const subs = await registerCommand(nats, {
  commandUUID: '9e5c1e0c-...',
  commandDisplayName: 'echo',
  regex: '^echo\\s+',
  platformPrefixAllowed: true,
  ratelimit: { mode: 'drop', level: 'user', limit: 5, interval: '1m' },
  // Optional overrides (default: '.*' for all)
  platform: 'irc',
  network: 'libera',
}, metrics);
```

**CommandRegistrationOptions:**

| Field | Type | Default | Description |
|---|---|---|---|
| `commandUUID` | `string` | — | Unique command identifier |
| `commandDisplayName` | `string` | — | Human-readable name (also used for control re-sub) |
| `regex` | `string` | — | Trigger regex |
| `platformPrefixAllowed` | `boolean` | — | Allow platform prefix before command |
| `ratelimit` | `RateLimitConfig` | — | Rate limiting config |
| `platform` | `string` | `'.*'` | Platform filter |
| `network` | `string` | `'.*'` | Network filter |
| `instance` | `string` | `'.*'` | Instance filter |
| `channel` | `string` | `'.*'` | Channel filter |
| `user` | `string` | `'.*'` | User filter |

**Returns:** Array of subscription promises (for the control re-registration subs).

#### `sendChatMessage(nats, message, metrics?, type?)`

Constructs the standard outgoing message envelope and publishes to `chat.message.outgoing.<platform>.<instance>.<channel>`.

```ts
sendChatMessage(nats, {
  channel, network, instance, platform,
  text: 'Hello!',
  trace: data.trace,
}, metrics);
```

**ChatMessage fields:** `channel`, `network`, `instance`, `platform`, `text`, `trace`.

#### `sendAction(nats, message, metrics?)`

Same as `sendChatMessage` but with `type: 'action.outgoing'` for IRC actions (`/me`).

#### `registerHelp(nats, moduleName, helpData, metrics?)`

Publishes help data to `help.update` immediately, then subscribes to `help.updateRequest` and `help.updateRequest.<moduleName>` to re-publish when requested.

```ts
const helpSubs = await registerHelp(nats, 'dice', [
  {
    command: 'roll',
    descr: 'Roll dice like a D&D nerd',
    params: [{ param: 'dicenotation', required: true, descr: 'XdY+Z or XdF or 4d6k3' }],
    aliases: ['r'],
  },
], metrics);
```

**HelpEntry:** `{ command, descr, params: Array<{ param, required, descr }>, aliases? }`

---

### Stats & RPC

#### `registerStatsHandlers(options)`

Subscribes to `stats.uptime` and `stats.emit.request` and responds with module uptime, memory usage, and Prometheus metrics. Returns subscription objects.

```ts
const statsSubs = registerStatsHandlers({
  nats,
  moduleName: 'dice',
  startTime: moduleStartTime,
  metrics,
  // Optional: custom Prometheus register (defaults to libeevee's shared register)
  // prometheusRegister: customRegister,
});
```

**StatsHandlersOptions:**

| Field | Type | Description |
|---|---|---|
| `nats` | `NatsClient` | Connected NATS client |
| `moduleName` | `string` | Module name for responses |
| `startTime` | `number` | `Date.now()` captured at startup |
| `metrics` | `ModuleMetrics?` | For recording pub/sub metrics |
| `prometheusRegister` | `any?` | Custom prom-client register |

#### `queryChannelUsers(nats, platform, instance, channel, options?)`

Queries the IRC connector for the user list in a channel via NATS RPC. Sends a `list-users-in-channel` control command and waits for a reply on a unique channel (5s timeout).

```ts
const users = await queryChannelUsers(nats, 'irc', 'libera', '#eevee', {
  metrics,
  producer: 'seen',       // for log messages
  timeoutMs: 5000,        // default: 5000
});
// users: Array<ChannelUser> — each user includes isChannelAdmin boolean
```

#### `queryUserModes(nats, platform, instance, channel, nick, options?)`

Queries the IRC connector for a specific user's channel modes via NATS RPC. Sends a `get-modes-for-user` control command and waits for a reply on a unique channel (5s timeout). The server is polled fresh every time (no caching).

```ts
const result = await queryUserModes(nats, 'irc', 'libera', '#eevee', 'alice', {
  metrics,
  producer: 'seen',       // for log messages
  timeoutMs: 5000,        // default: 5000
});
// result: UserModes — { channel, nick, modes, isChannelAdmin }
```

---

### Colorization

Platform-aware IRC color helpers. All functions are no-ops on non-IRC platforms — they return the original text unchanged.

#### `colorizeForPlatform(text, platform, color)`

Apply a named IRC foreground color to text. Supports all 26 `irc-colors` foreground colors.

```ts
colorizeForPlatform('hello', 'irc', 'cyan');   // → colored on IRC
colorizeForPlatform('hello', 'discord', 'cyan'); // → 'hello' unchanged
```

**IrcColorName values:** `white`, `black`, `navy`, `green`, `red`, `brown`, `maroon`, `purple`, `violet`, `olive`, `yellow`, `lightgreen`, `lime`, `teal`, `bluecyan`, `cyan`, `aqua`, `blue`, `royal`, `pink`, `lightpurple`, `fuchsia`, `gray`, `grey`, `lightgray`, `lightgrey`, `silver`

#### `colorizeBgForPlatform(text, platform, color)`

Apply a named IRC background color. Same naming convention with `bg` prefix: `bgwhite`, `bgblack`, `bgnavy`, etc.

#### `styleForPlatform(text, platform, style)`

Apply an IRC text style. **IrcStyleName values:** `normal`, `underline`, `bold`, `italic`, `inverse`, `strikethrough`, `monospace`

```ts
styleForPlatform('important', 'irc', 'bold');
```

#### `colorizeByType(text, platform, type, colorMap?)`

Semantic color mapping — pick a color by meaning rather than name. Uses a default map, overrideable per module.

```ts
colorizeByType('goos', 'irc', 'user'); // → cyan
colorizeByType('2d 3h ago', 'irc', 'date'); // → green

// Custom map:
const myMap = { user: 'pink', date: 'yellow', warning: 'red' };
colorizeByType(text, platform, 'user', myMap);
```

**Default semantic map:**

| Type | Color |
|---|---|
| `user` | cyan |
| `date` | green |
| `action` | yellow |
| `warning` | olive |
| `info` | blue |
| `title` | cyan |
| `error` | red |
| `success` | green |
| `highlight` | yellow |
| `muted` | gray |

#### `colorizeByValue(text, platform, value, definition)`

Pick a color based on a numeric value and range thresholds. Perfect for temperature, wind speed, humidity, etc.

```ts
colorizeByValue('72°F', 'irc', 72, {
  ranges: [
    { max: 32, color: 'blue' },
    { max: 50, color: 'cyan' },
    { max: 70, color: 'green' },
    { max: 80, color: 'yellow' },
    { max: 90, color: 'olive' },
  ],
  fallback: 'red',
});
// → yellow (72 is between 70 and 80)
```

#### `randomColorForPlatform(text, platform)`

Pick a random foreground color and apply it. Used by the emote module.

#### `rainbowForPlatform(text, platform, colorArr?)`

Apply rainbow colorization using `irc-colors.rainbow()`. Optionally provide a custom color array.

#### Strip Functions

- `stripColors(text)` — Remove IRC color codes
- `stripStyle(text)` — Remove IRC style codes
- `stripColorsAndStyle(text)` — Remove both

#### Direct Color Maps

If you need raw access to validated color functions:

```ts
import { fgColors, bgColors, styles } from '@eeveebot/libeevee';

fgColors.cyan('hello');  // same as colorizeForPlatform but without the platform check
bgColors.bgcyan('hello');
styles.bold('hello');
```

---

### Types

#### `RateLimitConfig`

```ts
interface RateLimitConfig {
  mode: 'enqueue' | 'drop';
  level: 'channel' | 'user' | 'global';
  limit: number;
  interval: string; // e.g. "30s", "1m", "5m"
}
```

Also exported as `defaultRateLimit` — `{ mode: 'drop', level: 'user', limit: 5, interval: '1m' }`.

#### `ChatMessage`

```ts
interface ChatMessage {
  channel: string;
  network: string;
  instance: string;
  platform: string;
  text: string;
  trace: string;
}
```

#### `HelpEntry`

```ts
interface HelpEntry {
  command: string;
  descr: string;
  params: Array<{ param: string; required: boolean; descr: string }>;
  aliases?: string[];
}
```

#### `ChannelUser`

```ts
interface ChannelUser {
  nick: string;
  ident: string;
  hostname: string;
  modes: string[];
  isChannelAdmin: boolean;
}
```

`isChannelAdmin` is `true` if the user has channel mode `+h` (halfop), `+o` (op), `+a` (admin/protect), or `+q` (owner).

#### `UserModes`

```ts
interface UserModes {
  channel: string;
  nick: string;
  modes: string[];
  isChannelAdmin: boolean;
}
```

`isChannelAdmin` is `true` if the user has channel mode `+h` (halfop), `+o` (op), `+a` (admin/protect), or `+q` (owner).

#### `SemanticColorMap`

```ts
interface SemanticColorMap {
  user?: IrcColorName;
  date?: IrcColorName;
  action?: IrcColorName;
  warning?: IrcColorName;
  info?: IrcColorName;
  title?: IrcColorName;
  error?: IrcColorName;
  success?: IrcColorName;
  highlight?: IrcColorName;
  muted?: IrcColorName;
  [key: string]: IrcColorName | undefined; // extensible
}
```

#### `ValueColorRange`

```ts
interface ValueColorRange {
  lt?: { threshold: number; color: IrcColorName };
  ranges?: Array<{ max: number; color: IrcColorName }>;
  fallback: IrcColorName;
}
```

---

### Logging

#### `log`

A pre-configured [winston](https://github.com/winstonjs/winston) logger instance. All eevee modules use this for structured logging — never `console.log`.

**Format depends on `NODE_ENV`:**

| Environment | Format | Example Output |
|---|---|---|
| Non-production | Colored, human-readable | `14:32:01 [info] [seen] Module started` |
| Production (`NODE_ENV=production`) | JSON with ISO timestamps | `{"timestamp":"2026-05-07T14:32:01Z","level":"info","producer":"seen","message":"Module started"}` |

Both formats include `errors({ stack: true })` (Error objects render their stack trace) and `splat()` (printf-style interpolation).

**Log levels:**

```ts
import { log } from '@eeveebot/libeevee';

log.debug('Detailed tracing info', { producer: 'seen' });
log.info('Module started', { producer: 'seen' });
log.warn('Rate limit exceeded', { producer: 'seen', channel: '#eevee' });
log.error('Failed to connect', { producer: 'seen', error: err.message });
```

**The `producer` convention:**

Every log call should include a `producer` field in the metadata object identifying the subsystem that generated the message. This is not enforced by winston — it's an eevee convention — but it makes filtering logs across a running deployment far more useful.

```ts
log.info('Incoming message published', { producer: 'ircClient', channel: '#eevee', user: 'goos' });
// Non-production: 14:32:01 [info] [ircClient] Incoming message published
// Production: {"timestamp":"...","level":"info","producer":"ircClient","message":"Incoming message published","channel":"#eevee","user":"goos"}
```

**Structured metadata:**

Pass any key-value pairs as the second argument. They become fields in the log output (JSON in production, embedded in the formatted string in dev):

```ts
log.info('Command executed', {
  producer: 'dice',
  platform: 'irc',
  channel: '#eevee',
  user: 'goos',
  result: '4d6k3 → 3, 5, 2, 6 (keep 3) → 14',
});
```

**Error logging pattern:**

Use `log.error()` with the error message (not the Error object) in the `error` field:

```ts
try {
  await someOperation();
} catch (error) {
  log.error('Operation failed', {
    producer: 'seen',
    error: error instanceof Error ? error.message : String(error),
  });
}
```

This keeps the output structured and searchable. The `errors({ stack: true })` transform handles stack traces when you do pass an Error object directly.

---

### Passthrough Exports

These are re-exported from their original libraries for convenience:

- `ircColors` — full `irc-colors` API (foreground/background colors, styles, rainbow, strip)
- `NatsClient` — NATS client class
- `NatsClient.isClosed()` — Returns `true` if the NATS connection is closed/disconnected. Used by the health endpoint to report connectivity status.
- `handleSIG` — Double-SIGINT force-exit handler

---

## Environment Variables

| Variable | Used By | Description |
|---|---|---|
| `NATS_HOST` | `createNatsConnection()` | NATS server hostname |
| `NATS_TOKEN` | `createNatsConnection()` | NATS auth token |
| `MODULE_CONFIG_PATH` | `loadModuleConfig()` | Path to YAML config file |
| `HTTP_API_PORT` | `setupHttpServer()` | Port for metrics/health HTTP server |

---

## Contributing

Contributions are welcome! Please see the [eevee contributing guide](https://github.com/eeveebot/eevee) for details.

## License

[CC BY-NC-SA 4.0](https://creativecommons.org/licenses/by-nc-sa/4.0/) — see [LICENSE](./LICENSE) for the full text.
