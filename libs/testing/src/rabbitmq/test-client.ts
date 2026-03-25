import * as amqp from 'amqplib';

const EXCHANGE = 'familieoya';
const EXCHANGE_TYPE = 'topic';

export interface TestRabbitMQClient {
  publishEvent(routingKey: string, payload: unknown): Promise<void>;

  /**
   * Binds a queue to the exchange with the given routing key.
   * Call this BEFORE triggering the action that publishes the event,
   * then call waitForMessage() to receive it.
   */
  bindQueue(queue: string, routingKey: string): Promise<void>;

  /**
   * Waits for the first message on a previously-bound queue.
   * Must call bindQueue() first.
   */
  waitForMessage(queue: string, timeoutMs?: number): Promise<unknown>;

  close(): Promise<void>;
}

export async function createTestRabbitMQClient(
  url: string,
): Promise<TestRabbitMQClient> {
  const connection = await amqp.connect(url);
  const channel = await connection.createChannel();

  await channel.assertExchange(EXCHANGE, EXCHANGE_TYPE, { durable: true });

  return {
    async publishEvent(routingKey: string, payload: unknown): Promise<void> {
      // NestJS RMQ transport expects { pattern, data } — mirrors ClientProxy.emit()
      const packet = { pattern: routingKey, data: payload };
      channel.publish(
        EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(packet)),
        { persistent: true },
      );
    },

    async bindQueue(queue: string, routingKey: string): Promise<void> {
      await channel.assertQueue(queue, { durable: false, autoDelete: true });
      await channel.bindQueue(queue, EXCHANGE, routingKey);
    },

    async waitForMessage(queue: string, timeoutMs = 5000): Promise<unknown> {
      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timed out waiting for message on queue: ${queue}`));
        }, timeoutMs);

        channel.consume(
          queue,
          (msg) => {
            if (!msg) return;
            clearTimeout(timer);
            channel.ack(msg);
            const body = JSON.parse(msg.content.toString()) as unknown;
            // Unwrap NestJS { pattern, data } envelope if present
            if (
              body &&
              typeof body === 'object' &&
              'data' in (body as object)
            ) {
              resolve((body as Record<string, unknown>)['data']);
            } else {
              resolve(body);
            }
          },
          { noAck: false },
        );
      });
    },

    async close(): Promise<void> {
      await channel.close();
      await connection.close();
    },
  };
}
