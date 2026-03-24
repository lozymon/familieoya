import * as amqp from 'amqplib';

const EXCHANGE = 'familieoya';
const EXCHANGE_TYPE = 'topic';

export interface TestRabbitMQClient {
  publishEvent(routingKey: string, payload: unknown): Promise<void>;
  waitForEvent(queue: string, timeoutMs?: number): Promise<unknown>;
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
      channel.publish(
        EXCHANGE,
        routingKey,
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );
    },

    async waitForEvent(queue: string, timeoutMs = 5000): Promise<unknown> {
      await channel.assertQueue(queue, { durable: true });
      await channel.bindQueue(queue, EXCHANGE, '#');

      return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
          reject(new Error(`Timed out waiting for event on queue: ${queue}`));
        }, timeoutMs);

        channel.consume(queue, (msg) => {
          if (!msg) return;
          clearTimeout(timer);
          channel.ack(msg);
          resolve(JSON.parse(msg.content.toString()) as unknown);
        }, { noAck: false });
      });
    },

    async close(): Promise<void> {
      await channel.close();
      await connection.close();
    },
  };
}
