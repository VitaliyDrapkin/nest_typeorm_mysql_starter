import { DeepPartial, FindOptionsWhere, In, Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import { QueryDeepPartialEntity } from 'typeorm/query-builder/QueryPartialEntity';

/**
 * Generic base repository with typed filter support.
 *
 * @template T - Entity type (must have an `id` of type number).
 * @template F - Allowed filter keys (as readonly array of strings).
 */
export abstract class BaseRepository<
  T extends { id: number },
  F extends readonly string[],
> {
  protected constructor(protected readonly repository: Repository<T>) {}

  public async addOne(entity: DeepPartial<T>): Promise<T> {
    const createdEntity = await this.repository.save(entity);
    return await this.getById(createdEntity.id);
  }

  public async addMany(entities: DeepPartial<T>[]): Promise<T[]> {
    const createdEntities = await this.repository.save(entities);
    const createdEntitiesIds: number[] = createdEntities.map(
      (entity) => entity.id,
    );
    return await this.repository.find({
      where: { id: In(createdEntitiesIds) } as FindOptionsWhere<T>,
      relations: this.getRelations(),
    });
  }

  public async getById(
    id: number,
    options?: { relations?: string[] },
  ): Promise<T> {
    return await this.repository.findOne({
      where: { id } as FindOptionsWhere<T>,
      relations: options?.relations ?? this.getRelations(),
    });
  }

  public async getOneByQuery(
    query: Partial<Record<F[number], any>>,
    options?: { relations?: string[] },
  ): Promise<T | undefined> {
    const filters = this.queryToFilters(query);
    return await this.repository.findOne({
      where: filters,
      relations: options?.relations ?? this.getRelations(),
    });
  }

  public async getManyByQuery(
    query: Partial<Record<F[number], any>>,
    options?: { skip?: number; take?: number; relations?: string[] },
  ): Promise<[T[], number]> {
    const filters = this.queryToFilters(query);
    return await this.repository.findAndCount({
      where: filters,
      relations: options?.relations ?? this.getRelations(),
      take: options?.take,
      skip: options?.skip,
    });
  }

  public async updateById(
    id: number,
    partialEntity: QueryDeepPartialEntity<T>,
  ): Promise<boolean> {
    const response = await this.repository.update(id, partialEntity);
    return response.affected > 0;
  }

  public async updateManyByQuery(
    query: Partial<Record<F[number], any>>,
    partialEntity: QueryDeepPartialEntity<T>,
  ): Promise<number> {
    const filters = this.queryToFilters(query);
    const response = await this.repository.update(filters, partialEntity);
    return response.affected || 0;
  }

  public async deleteById(id: number): Promise<boolean> {
    const response = await this.repository.softDelete(id);
    return response.affected > 0;
  }

  public async deleteManyByQuery(
    query: Partial<Record<F[number], any>>,
  ): Promise<number> {
    const filters = this.queryToFilters(query);
    const response = await this.repository.softDelete(filters);
    return response.affected || 0;
  }

  public async countByQuery(
    query: Partial<Record<F[number], any>>,
  ): Promise<number> {
    const filters = this.queryToFilters(query);
    return await this.repository.count({
      where: filters,
      relations: this.getRelations(),
    });
  }

  /**
   * This method provides a list of key transformations to apply when processing
   * filter queries or other similar operations.
   *
   * Each transformation maps a set of keys to a new key. This can be useful
   * when you want to aggregate multiple query parameters into a single filter
   * or rename keys for consistency in your processing logic.
   *
   * Example:
   * [
   *   { keys: ['start_date', 'end_date'], newKey: 'dateRange' },
   *   { keys: ['min_price', 'max_price'], newKey: 'priceRange' }
   * ]
   */
  protected getKeyTransformations(): Array<{
    keys: string[];
    newKey: F[number];
  }> {
    return [];
  }

  public queryToFilters(
    query: Partial<Record<F[number], any>>,
  ): FindOptionsWhere<T> {
    const filters: FindOptionsWhere<T> = {};
    const strategies = this.filterStrategies();
    const transformedQuery = this.transformKeys(
      query,
      this.getKeyTransformations(),
    );

    for (const [key, value] of Object.entries(transformedQuery)) {
      if (this.exludeStrategies().includes(key)) continue;

      const strategy = strategies[key as F[number]];
      if (!strategy) {
        throw new HttpException(
          `Unhandled query filter key: ${key}`,
          HttpStatus.CONFLICT,
        );
      }

      Object.assign(filters, strategy(value));
    }

    return filters;
  }

  private transformKeys(
    query: Partial<Record<F[number], any>>,
    transformations: Array<{ keys: string[]; newKey: F[number] }>,
  ): Partial<Record<F[number], any>> {
    const newQuery = { ...query };

    for (const { keys, newKey } of transformations) {
      const values = keys.map((k) => newQuery[k as F[number]]);

      if (values.every((v) => v !== undefined)) {
        newQuery[newKey] = Object.fromEntries(
          keys.map((k, i) => [k, values[i]]),
        );
        keys.forEach((k) => delete newQuery[k as F[number]]);
      }
    }

    return newQuery;
  }

  /**
   * Defines how query keys map to TypeORM filter objects.
   *
   * Example:
   * {
   *   username: (value) => ({ username: Like(`%${value}%`) }),
   *   isActive: (value) => ({ isActive: value }),
   * }
   */
  protected abstract filterStrategies(): {
    [K in F[number]]: (value: any) => FindOptionsWhere<T>;
  };

  /**
   * This abstract method should return an array of strings representing the
   * relationships (i.e., related entities) that need to be included in queries.
   */
  protected abstract getRelations(): string[];

  /**
   * This method should return an array of strings representing the strategies
   * that should be excluded from the query.
   */
  protected exludeStrategies(): string[] {
    return ['take', 'skip', 'responseType'];
  }
}
