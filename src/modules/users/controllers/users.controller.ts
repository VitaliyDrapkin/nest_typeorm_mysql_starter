import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { UserResponseDto } from '../dto/responses/user.response.dto';
import { UsersService } from '../services/users.service';
import { GetUsersQueryDto } from '../dto/queries/get-users.query.dto';
import { PaginationResponseDto } from '@src/shared/dtos/pagination.response.dto';
import { CreateUserRequestDto } from '../dto/requests/create-user.request.dto';
import { CurrentUser } from '@src/common/decorators/current-user.decorator';
import { User } from '@telegram-apps/init-data-node';
import { Public } from '@src/common/decorators/public.decorator';
import { CustomTimeout } from '@src/common/decorators/custom-timeout.decorator';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Post('')
  async addUser(@Body() user: CreateUserRequestDto): Promise<UserResponseDto> {
    return this.usersService.addUser(user);
  }

  @Get('')
  async getUsers(
    @Query() query: GetUsersQueryDto,
  ): Promise<PaginationResponseDto<UserResponseDto>> {
    return this.usersService.getUsers(query);
  }

  @Get(':id')
  async getUserById(@Param('id') id: number): Promise<UserResponseDto> {
    return this.usersService.getById(id);
  }

  @Get('profile')
  async getProfile(@CurrentUser() user: User): Promise<UserResponseDto> {
    return this.usersService.getById(user.id);
  }

  @Get('public-route')
  @Public()
  async publicRoute(): Promise<string> {
    return 'public route';
  }

  @Get('long-timeout')
  @CustomTimeout(30000)
  async longTimeout(): Promise<string> {
    return 'long timeout';
  }
}
