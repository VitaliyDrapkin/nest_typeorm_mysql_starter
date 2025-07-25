# 🚀 NestJS Starter — TypeORM + MySQL

This is a starter template for projects using **NestJS**, **TypeORM**, and **MySQL**. It provides a solid foundation
for building scalable server-side applications, with optional database support and built-in structure for real-world APIs.

---

## 📦 Getting Started

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
# Copy the example .env file to create your local environment configuration
cp .env.example .env
```

3. Fill in database credentials and `JWT_SECRET` in the `.env` file.

4. Run the project:

```bash
npm run start       # Start in production mode
npm run start:dev   # Start in development mode with hot-reload
npm run build       # Build the project
```

---

## ⚙️ Running Without Database

If you want to run the project without TypeORM/MySQL:

- Delete the `database/` folder
- Remove `DatabaseModule` import from `CoreModule` (`src/core`)
- Delete the `data-source.ts` file in the root
- Delete the `scripts/` folder (migration scripts)
- Remove repository usage in the `users` module and its dependencies
- You can then integrate your own database if needed

---

## 🛠 Configuration

- Environment variables are configured in `.env`
- Additional settings and validation can be found in:
  - `config/`
  - `validation.schema.ts` (Joi schema for `.env` validation)

---

## 🧩 Project Structure

### Core (`src/core/`)

Global features and modules:

- `exceptions/` — global error handling with readable responses
- `guards/` — built-in JWT authentication for all routes
- `interceptors/`:
  - `logger.interceptor.ts` — logs requests and responses
  - `timeout.interceptor.ts` — handles response timeouts
- `logger/` — Winston-based logging
- `core.module.ts` — registers global modules like JWT, Schedule, and TypeORM

### Common (`src/common/`)

Reusable utilities and decorators:

- `decorators/` — Custom decorators for controllers and routes
- `dto/` — token payload types
- `enums/` — enums like user roles
- `base-repository.ts` — extended TypeORM repository with reusable query helpers

### Database (`src/database/`)

For managing migrations and seeders:

- `migration/` — stores generated migrations
- `seeders/` — manually created seed data
- Migration scripts are located in `scripts/`

> 🛠 **To generate a migration:**
>
> 1. Ensure your DB is running and configured
> 2. Create an `Entity` in a module (e.g. `users`)
> 3. Run:
>
> ```bash
> npm run migration <MigrationName>
> ```
>
> 4. Rename the generated file to include `.migration.ts` suffix:
>    `123456789-test.ts` → `123456789-test.migration.ts`
> 5. Restart the project — migration will run automatically

---

### Shared (`src/shared/`)

Shared utilities and helpers:

- `api-manager/` — for internal server-to-server API requests
- `dtos/`, `transformers/`, `types/` — pagination and data transformation tools

See `users` module for an example.

---

## 📘 Logging

This project comes with a built-in and pre-configured logging service based on [Winston](https://github.com/winstonjs/winston).

It supports the following log levels, listed from most to least verbose:

- `debug`
- `info`
- `warn`
- `error`

You can control which levels are output by setting the `LOG_LEVEL` variable in your `.env` file:

Only messages at this level and above will be shown.

## 💾File Logging

To enable writing logs to files, use the LOG_TO_FILE environment variable:

When enabled, logs will be saved in the logs/ directory:

logs/combined.log — contains all logs (info and above)

logs/error.log — contains only error logs

---

### Modules (`src/modules/`)

Every module follows this standard structure:

```
/users
├── controller.ts     # API endpoints
├── service.ts        # Business logic
├── repository.ts     # DB layer (if used)
├── entities/         # TypeORM entities
├── dto/
│   ├── queries/      # GET queries, filters, pagination
│   ├── requests/     # POST/PUT/PATCH requests
│   └── response/     # Output DTOs using class-transformer
├── interfaces/       # Shared and internal types used in the module
├── users.module.ts   # Main module file
```

> ⚠️ **Module Guidelines:**
>
> - A module may import:
>   - its own services, controllers, repositories
>   - other modules entirely
> - A module **must not import** services or repositories from other modules
> - Only services should be exported

More on [NestJS Modules](https://docs.nestjs.com/modules)

---

## 🎯 Decorators

This project includes several custom decorators to enhance controller functionality and security. All decorators are located in `src/common/decorators/`.

### @CurrentUser()

Extracts the authenticated user from the JWT token. Automatically injected by the `CurrentUserInterceptor`.

**Import:**

```typescript
import { CurrentUser } from '@src/common/decorators/current-user.decorator';
import { JwtUserDetailsDto } from '@src/common/dto/jwt-user-details.dto';
```

**Usage:**

```typescript
@Controller('users')
export class UsersController {
  @Get('profile')
  getProfile(@CurrentUser() user: JwtUserDetailsDto) {
    return this.service.findOne(user.id);
  }

  @Post()
  create(
    @Body() createUserDto: CreateUserRequestDto,
    @CurrentUser() user: JwtUserDetailsDto,
  ) {
    return this.service.create(createUserDto, user.id);
  }
}
```

**Available User Properties:**

```typescript
export class JwtUserDetailsDto {
  id: number; // User's unique identifier
}
```

### @Public()

Marks a route as publicly accessible, bypassing JWT authentication. Use for authentication endpoints, health checks, and public APIs.

**Import:**

```typescript
import { Public } from '@src/common/decorators/public.decorator';
```

**Usage:**

```typescript
@Controller('auth')
export class AuthController {
  @Post('login')
  @Public()
  async login(@Body() loginDto: LoginDto) {
    // Public login endpoint
  }

  @Get('health')
  @Public()
  async healthCheck() {
    // Public health check endpoint
  }
}
```

### @CustomTimeout()

Sets a custom timeout for long-running operations. Useful for file uploads, report generation, or data processing tasks.

**Import:**

```typescript
import { CustomTimeout } from '@src/common/decorators/custom-timeout.decorator';
```

**Usage:**

```typescript
@Controller('reports')
export class ReportsController {
  @Get('generate')
  @CustomTimeout(30000) // 30 seconds timeout
  async generateReport() {
    // Long-running report generation
  }

  @Post('upload')
  @CustomTimeout(60000) // 60 seconds timeout
  async uploadLargeFile() {
    // Large file upload operation
  }
}
```

### @Roles()

Restricts access to routes based on user roles. Must be used with the `RolesGuard` for proper authorization.

**Import:**

```typescript
import { Roles } from '@src/common/decorators/roles.decorator';
import { RoleEnum } from '@src/common/enums/role.enum';
```

**Usage:**

```typescript
@Controller('admin')
export class AdminController {
  @Get('dashboard')
  @Roles(RoleEnum.ADMIN)
  async getDashboard() {
    // Only accessible by admins
  }

  @Get('reports')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  async getReports() {
    // Accessible by both admins and managers
  }
}
```

**Available Roles:**

```typescript
export enum RoleEnum {
  USER = 'user',
  ADMIN = 'admin',
}
```

### Combining Decorators

You can combine multiple decorators on the same route:

```typescript
@Controller('admin')
export class AdminController {
  @Get('user/:id')
  @Roles(RoleEnum.ADMIN)
  @CustomTimeout(5000)
  async getUserDetails(
    @Param('id') id: string,
    @CurrentUser() admin: JwtUserDetailsDto,
  ) {
    // Protected route with custom timeout and role check
  }
}
```

### Best Practices

1. **@CurrentUser()**: Always type the parameter as `JwtUserDetailsDto` for type safety
2. **@Public()**: Use for authentication-related endpoints (login, register, health checks)
3. **@Roles()**: Use in combination with `@UseGuards(RolesGuard)` for role-based access control
4. **@CustomTimeout()**: Apply only when necessary for long-running operations
5. **Order**: Place authentication decorators first when combining multiple decorators

---

## 📍 Entry Point

The `main.ts` file bootstraps the application and applies global middleware, pipes, and logging.

---

## ✅ Author

**Vitaliy Drapkin**

---

## 💡 Good Luck!
