import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

const SEEDED_CATEGORIES = [
  { key: 'food', name: 'Food' },
  { key: 'electricity', name: 'Electricity' },
  { key: 'housing', name: 'Housing' },
  { key: 'transport', name: 'Transport' },
  { key: 'childcare', name: 'Childcare' },
  { key: 'healthcare', name: 'Healthcare' },
  { key: 'clothing', name: 'Clothing' },
  { key: 'entertainment', name: 'Entertainment' },
  { key: 'dining_out', name: 'Dining out' },
  { key: 'savings', name: 'Savings' },
];

@Injectable()
export class CategoryService {
  constructor(
    @InjectRepository(Category)
    private readonly categories: Repository<Category>,
  ) {}

  async seedForHousehold(householdId: string): Promise<void> {
    const existing = await this.categories.count({ where: { householdId } });
    if (existing > 0) return;

    const seeds = SEEDED_CATEGORIES.map((s) =>
      this.categories.create({ householdId, key: s.key, name: s.name }),
    );
    await this.categories.save(seeds);
  }

  async listCategories(householdId: string): Promise<Category[]> {
    await this.seedForHousehold(householdId);
    return this.categories.find({
      where: { householdId },
      order: { createdAt: 'ASC' },
    });
  }

  async createCategory(
    householdId: string,
    dto: CreateCategoryDto,
  ): Promise<Category> {
    const category = this.categories.create({
      householdId,
      key: null,
      name: dto.name,
    });
    return this.categories.save(category);
  }

  async updateCategory(
    householdId: string,
    id: string,
    dto: UpdateCategoryDto,
  ): Promise<Category> {
    const category = await this.findOneOrFail(householdId, id);

    if (category.key !== null) {
      throw new ConflictException('Seeded categories cannot be renamed');
    }

    if (dto.name !== undefined) {
      category.name = dto.name;
    }

    return this.categories.save(category);
  }

  async deleteCategory(householdId: string, id: string): Promise<void> {
    const category = await this.findOneOrFail(householdId, id);

    if (category.key !== null) {
      throw new ConflictException('Seeded categories cannot be deleted');
    }

    await this.categories.remove(category);
  }

  async findOneOrFail(householdId: string, id: string): Promise<Category> {
    const category = await this.categories.findOne({
      where: { id, householdId },
    });
    if (!category) throw new NotFoundException('Category not found');
    return category;
  }

  async deleteAllForHousehold(householdId: string): Promise<void> {
    await this.categories.delete({ householdId });
  }
}
