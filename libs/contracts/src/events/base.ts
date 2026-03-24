export interface BaseEvent {
  /** Set once by the publisher using crypto.randomUUID(). Never changed on retry. */
  eventId: string;
}
