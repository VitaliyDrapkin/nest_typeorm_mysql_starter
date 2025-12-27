import { In, ILike, Between, Repository } from 'typeorm';
import { Injectable } from '@nestjs/common';
import { LogService } from '@src/core/logger/log-service';
import { plainToInstance } from 'class-transformer';
import { GetUsersQueryDto } from '../dto/queries/get-users.query.dto';
import { UserResponseDto } from '../dto/responses/user.response.dto';
import { CreateUserRequestDto } from '../dto/requests/create-user.request.dto';
import { PaginationResponseDto } from '@src/shared/dto/pagination.response.dto';
import { PaginationTransformer } from '@src/shared/transformers/pagination.transformer';
import { InjectRepository } from '@nestjs/typeorm';
import { UserEntity } from '../entities/user.entity';

@Injectable()
export class UsersService {
  constructor(
    private readonly logger: LogService,
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
  ) {
    this.logger.setContext(`${this.constructor.name}`);
  }

  async addUser(user: CreateUserRequestDto): Promise<UserResponseDto> {
    const createdUser = await this.userRepository.save(user);
    return plainToInstance(UserResponseDto, createdUser, {
      excludeExtraneousValues: true,
    });
  }

  async getById(id: number): Promise<UserResponseDto> {
    const user = await this.userRepository.findOne({ where: { id } });
    return plainToInstance(UserResponseDto, user, {
      excludeExtraneousValues: true,
    });
  }

  async getUsers(
    query: GetUsersQueryDto,
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    const filters = this.buildFilters(query);
    const [users, total] = await this.userRepository.findAndCount({
      where: filters,
      skip: query.skip,
      take: query.take,
    });
    return PaginationTransformer.toPaginationResponseDto(
      users,
      total,
      query.skip,
      query.take,
      UserResponseDto,
    );
  }

  private buildFilters(query: GetUsersQueryDto): Record<string, any> {
    const filters: Record<string, any> = {};

    const strategies: Record<
      string,
      ((value: any) => Record<string, any>) | null
    > = {
      status: (value: string[]) => ({ status: In(value) }),
      name: (value: string) => ({ name: ILike(`%${value}%`) }),
      email: (value: string) => ({ email: ILike(`%${value}%`) }),
      createdAtRange: (value: { start: Date; end: Date }) => ({
        createdAt: Between(value.start, value.end),
      }),
    };

    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      if (key === 'skip' || key === 'take') continue;

      const strategy = strategies[key];
      if (strategy) {
        Object.assign(filters, strategy(value));
      }
    }

    return filters;
  }
}
