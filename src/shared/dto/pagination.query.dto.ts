import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsInt, IsOptional, Min } from 'class-validator';

export class PaginationQueryDto {
  @ApiProperty({
    type: Number,
    required: false,
    default: 0,
  })
  @IsInt()
  @Min(0)
  @Transform(({ value }) => Number(value))
  @IsOptional()
  skip?: number = 0;

  @ApiProperty({
    type: Number,
    required: false,
    default: 100,
  })
  @IsInt()
  @Min(1)
  @Transform(({ value }) => Number(value))
  @IsOptional()
  take?: number = 100;
}
