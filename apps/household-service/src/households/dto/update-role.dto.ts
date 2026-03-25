import { IsIn } from 'class-validator';
import { MemberRole } from '../entities/household-member.entity';

export class UpdateRoleDto {
  @IsIn(['admin', 'member'])
  role!: MemberRole;
}
