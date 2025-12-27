# PaginationTransformer Usage Guide

## Quick Reference

```typescript
PaginationTransformer.toPaginationResponseDto(
  data,        // Items array
  totalItems,  // Total count from DB
  skip,        // Offset
  take,        // Limit
  transformer? // Optional: DTO class or mapper function
);
```

## Three Modes

### 1. Raw Data (No Transformation)
⚠️ **Warning:** Exposes all fields including sensitive data!

```typescript
const [users, total] = await this.userRepository.findAndCount({ skip, take });
return PaginationTransformer.toPaginationResponseDto(users, total, skip, take);
```

### 2. Class-Based (Recommended)
✅ Only exposes `@Expose()` decorated fields

```typescript
// DTO
export class UserResponseDto {
  @Expose() id: number;
  @Expose() name: string;
  @Expose() email: string;
  // password field is NOT included
}

// Service
const [users, total] = await this.userRepository.findAndCount({
  skip: query.skip,
  take: query.take,
});

return PaginationTransformer.toPaginationResponseDto(
  users,
  total,
  query.skip,
  query.take,
  UserResponseDto, // Pass DTO class
);
```

### 3. Function-Based
For custom transformation logic

```typescript
return PaginationTransformer.toPaginationResponseDto(
  users,
  total,
  skip,
  take,
  (user) => ({
    id: user.id,
    fullName: `${user.firstName} ${user.lastName}`,
    isActive: user.status === 'active',
  }),
);
```

## Response Structure

```json
{
  "data": [...],
  "totalItems": 50,
  "totalPages": 5,
  "currentPage": 1,
  "itemsPerPage": 10,
  "hasNextPage": true,
  "hasPreviousPage": false
}
```

## Best Practices

### ✅ DO
```typescript
// Use findAndCount for efficiency
const [users, total] = await this.userRepository.findAndCount({ skip, take });

// Always use DTO or mapper to hide sensitive fields
return PaginationTransformer.toPaginationResponseDto(users, total, skip, take, UserResponseDto);
```

### ❌ DON'T
```typescript
// Don't return raw entities with passwords/tokens
return PaginationTransformer.toPaginationResponseDto(users, total, skip, take); // ❌

// Don't count separately (inefficient)
const users = await this.userRepository.find({ skip, take });
const total = await this.userRepository.count(); // ❌

// Don't mix up skip/take order
return PaginationTransformer.toPaginationResponseDto(users, total, take, skip); // ❌
```

## Full Example

```typescript
// Query DTO
export class GetUsersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(0)
  skip: number = 0;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  take: number = 10;
}

// Controller
@Get()
async getUsers(@Query() query: GetUsersQueryDto): Promise<PaginationResponseDto<UserResponseDto>> {
  return this.usersService.getUsers(query);
}

// Service
async getUsers(query: GetUsersQueryDto): Promise<PaginationResponseDto<UserResponseDto>> {
  const [users, total] = await this.userRepository.findAndCount({
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
```