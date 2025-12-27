import { plainToInstance, ClassConstructor } from 'class-transformer';
import { PaginationResponseDto } from '@src/shared/dto/pagination.response.dto';

/**
 * Transformer for converting raw data to paginated response DTOs
 * Supports three transformation modes:
 * 1. No transformation (returns raw data)
 * 2. Class-based transformation (uses plainToInstance with class-transformer decorators)
 * 3. Function-based transformation (custom mapper function)
 */
export class PaginationTransformer {
  /**
   * Transform raw data to paginated response without DTO transformation
   * @param data - Array of raw items
   * @param totalItems - Total count of items in database
   * @param skip - Number of items to skip (offset)
   * @param take - Number of items to take (limit)
   */
  static toPaginationResponseDto<T>(
    data: T[],
    totalItems: number,
    skip: number,
    take: number,
  ): PaginationResponseDto<T>;

  /**
   * Transform raw data to paginated response with custom transformer function
   * @param data - Array of raw items
   * @param totalItems - Total count of items in database
   * @param skip - Number of items to skip (offset)
   * @param take - Number of items to take (limit)
   * @param transformer - Custom function to transform each item
   */
  static toPaginationResponseDto<D, T>(
    data: T[],
    totalItems: number,
    skip: number,
    take: number,
    transformer: (item: T) => D,
  ): PaginationResponseDto<D>;

  /**
   * Transform raw data to paginated response with DTO class
   * @param data - Array of raw items (entities)
   * @param totalItems - Total count of items in database
   * @param skip - Number of items to skip (offset)
   * @param take - Number of items to take (limit)
   * @param classType - DTO class for transformation via class-transformer
   */
  static toPaginationResponseDto<D, T>(
    data: T[],
    totalItems: number,
    skip: number,
    take: number,
    classType: ClassConstructor<D>,
  ): PaginationResponseDto<D>;

  /**
   * Main implementation of pagination transformation
   */
  static toPaginationResponseDto<D, T>(
    data: T[],
    totalItems: number,
    skip: number,
    take: number,
    transformerOrClass?: ((item: T) => D) | ClassConstructor<D>,
  ): PaginationResponseDto<T> | PaginationResponseDto<D> {
    // Validate pagination parameters
    if (take <= 0) {
      throw new Error('Take must be greater than 0');
    }

    if (skip < 0) {
      throw new Error('Skip must be non-negative');
    }

    if (totalItems < 0) {
      throw new Error('Total items must be non-negative');
    }

    // Calculate pagination metadata
    const currentPage = Math.floor(skip / take) + 1;
    const totalPages = Math.ceil(totalItems / take) || 1;

    // Transform data based on provided transformer/class
    let transformedData: (T | D)[];

    if (!transformerOrClass) {
      // No transformation - return raw data
      transformedData = data;
    } else if (this.isClassConstructor(transformerOrClass)) {
      // Class-based transformation using class-transformer
      transformedData = plainToInstance(
        transformerOrClass as ClassConstructor<D>,
        data,
        {
          excludeExtraneousValues: true,
          exposeUnsetFields: false,
        },
      );
    } else {
      // Function-based transformation
      transformedData = data.map((item) =>
        (transformerOrClass as (item: T) => D)(item),
      );
    }

    return {
      data: transformedData as any[],
      totalItems,
      totalPages,
      currentPage,
      itemsPerPage: take,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    };
  }

  /**
   * Check if provided value is a class constructor
   */
  private static isClassConstructor<D>(
    value: any,
  ): value is ClassConstructor<D> {
    return (
      typeof value === 'function' &&
      value.prototype !== undefined &&
      value.prototype.constructor === value
    );
  }
}
