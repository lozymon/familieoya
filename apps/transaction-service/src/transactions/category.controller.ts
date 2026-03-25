import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

function requireHouseholdId(id: string | undefined): string {
  if (!id) throw new UnauthorizedException('x-household-id header missing');
  return id;
}

@Controller('categories')
export class CategoryController {
  constructor(private readonly service: CategoryService) {}

  @Get()
  list(@Headers('x-household-id') householdId: string | undefined) {
    return this.service.listCategories(requireHouseholdId(householdId));
  }

  @Post()
  create(
    @Headers('x-household-id') householdId: string | undefined,
    @Body() dto: CreateCategoryDto,
  ) {
    return this.service.createCategory(requireHouseholdId(householdId), dto);
  }

  @Patch(':id')
  update(
    @Headers('x-household-id') householdId: string | undefined,
    @Param('id') id: string,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.service.updateCategory(
      requireHouseholdId(householdId),
      id,
      dto,
    );
  }

  @Delete(':id')
  @HttpCode(204)
  remove(
    @Headers('x-household-id') householdId: string | undefined,
    @Param('id') id: string,
  ) {
    return this.service.deleteCategory(requireHouseholdId(householdId), id);
  }
}
