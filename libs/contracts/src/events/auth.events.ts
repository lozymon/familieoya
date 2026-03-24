import { BaseEvent } from './base';

export const USER_REGISTERED = 'user.registered';
export const USER_DELETED = 'user.deleted';
export const USER_DATA_EXPORTED = 'user.data.exported';

export interface UserRegisteredEvent extends BaseEvent {
  userId: string;
  email: string;
  name: string;
  preferredLanguage: 'en' | 'no' | 'pt';
}

export interface UserDeletedEvent extends BaseEvent {
  userId: string;
}

export interface UserDataExportedEvent extends BaseEvent {
  userId: string;
}
