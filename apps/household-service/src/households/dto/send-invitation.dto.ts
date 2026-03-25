import { IsEmail } from 'class-validator';

export class SendInvitationDto {
  @IsEmail()
  email!: string;
}
