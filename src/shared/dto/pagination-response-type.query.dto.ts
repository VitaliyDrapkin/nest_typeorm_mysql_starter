import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { PaginationQueryDto } from './pagination.query.dto';
import { ResponseTypeEnum } from '../enums/response-type.enum';

export class PaginationResponseTypeQueryDto extends PaginationQueryDto {
  @ApiProperty({
    enum: ResponseTypeEnum,
    required: false,
  })
  @IsOptional()
  @IsEnum(ResponseTypeEnum)
  responseType?: ResponseTypeEnum;
}
