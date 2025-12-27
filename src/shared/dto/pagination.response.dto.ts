import { ApiProperty } from '@nestjs/swagger';

export abstract class PaginationResponseDto<T> {
  @ApiProperty({ type: Number, description: 'Total number of items' })
  totalItems: number;

  @ApiProperty({ type: Number, description: 'Total number of pages' })
  totalPages: number;

  @ApiProperty({ type: Number, description: 'Current page number' })
  currentPage: number;

  @ApiProperty({ type: Number, description: 'Number of items per page' })
  itemsPerPage: number;

  @ApiProperty({
    type: Boolean,
    description: 'Indicates if there is a next page',
  })
  hasNextPage: boolean;

  @ApiProperty({
    type: Boolean,
    description: 'Indicates if there is a previous page',
  })
  hasPreviousPage: boolean;

  @ApiProperty({ isArray: true })
  abstract data: T[];
}
