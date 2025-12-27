import { PaginationTransformer } from './pagination.transformer';
import { Expose } from 'class-transformer';

class MockUserDto {
  @Expose()
  id: number;

  @Expose()
  name: string;

  // This field should NOT be exposed
  password?: string;
}

describe('PaginationTransformer', () => {
  describe('toPaginationResponseDto', () => {
    describe('Mode 1: No transformation', () => {
      it('should return paginated response without transformation', () => {
        const data = [
          { id: 1, name: 'John', password: 'secret1' },
          { id: 2, name: 'Jane', password: 'secret2' },
        ];

        const result = PaginationTransformer.toPaginationResponseDto(
          data,
          50,
          0,
          10,
        );

        expect(result.data).toEqual(data);
        expect(result.data[0]).toHaveProperty('password'); // Raw data includes password
        expect(result.totalItems).toBe(50);
        expect(result.totalPages).toBe(5);
        expect(result.currentPage).toBe(1);
        expect(result.itemsPerPage).toBe(10);
        expect(result.hasNextPage).toBe(true);
        expect(result.hasPreviousPage).toBe(false);
      });
    });

    describe('Mode 2: Class-based transformation', () => {
      it('should transform data using DTO class with excludeExtraneousValues', () => {
        const data = [
          { id: 1, name: 'John', password: 'secret1' },
          { id: 2, name: 'Jane', password: 'secret2' },
        ];

        const result = PaginationTransformer.toPaginationResponseDto(
          data,
          50,
          0,
          10,
          MockUserDto,
        );

        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toEqual({ id: 1, name: 'John' });
        expect(result.data[0]).not.toHaveProperty('password'); // Password excluded
        expect(result.data[1]).toEqual({ id: 2, name: 'Jane' });
        expect(result.totalItems).toBe(50);
      });

      it('should handle empty array with DTO class', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          0,
          0,
          10,
          MockUserDto,
        );

        expect(result.data).toEqual([]);
        expect(result.totalItems).toBe(0);
        expect(result.totalPages).toBe(1);
      });
    });

    describe('Mode 3: Function-based transformation', () => {
      it('should transform data using custom function', () => {
        const data = [
          { id: 1, firstName: 'John', lastName: 'Doe', age: 30 },
          { id: 2, firstName: 'Jane', lastName: 'Smith', age: 25 },
        ];

        const result = PaginationTransformer.toPaginationResponseDto(
          data,
          50,
          0,
          10,
          (user) => ({
            id: user.id,
            fullName: `${user.firstName} ${user.lastName}`,
            isAdult: user.age >= 18,
          }),
        );

        expect(result.data).toHaveLength(2);
        expect(result.data[0]).toEqual({
          id: 1,
          fullName: 'John Doe',
          isAdult: true,
        });
        expect(result.data[1]).toEqual({
          id: 2,
          fullName: 'Jane Smith',
          isAdult: true,
        });
      });

      it('should handle complex transformation logic', () => {
        const data = [
          { id: 1, status: 'active', points: 100 },
          { id: 2, status: 'inactive', points: 50 },
        ];

        const result = PaginationTransformer.toPaginationResponseDto(
          data,
          10,
          0,
          5,
          (item) => ({
            id: item.id,
            isActive: item.status === 'active',
            level: item.points >= 100 ? 'gold' : 'silver',
          }),
        );

        expect(result.data[0]).toEqual({
          id: 1,
          isActive: true,
          level: 'gold',
        });
        expect(result.data[1]).toEqual({
          id: 2,
          isActive: false,
          level: 'silver',
        });
      });
    });

    describe('Pagination metadata calculation', () => {
      it('should calculate first page correctly', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          50,
          0,
          10,
        );

        expect(result.currentPage).toBe(1);
        expect(result.totalPages).toBe(5);
        expect(result.hasNextPage).toBe(true);
        expect(result.hasPreviousPage).toBe(false);
      });

      it('should calculate middle page correctly', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          50,
          20,
          10,
        );

        expect(result.currentPage).toBe(3);
        expect(result.totalPages).toBe(5);
        expect(result.hasNextPage).toBe(true);
        expect(result.hasPreviousPage).toBe(true);
      });

      it('should calculate last page correctly', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          50,
          40,
          10,
        );

        expect(result.currentPage).toBe(5);
        expect(result.totalPages).toBe(5);
        expect(result.hasNextPage).toBe(false);
        expect(result.hasPreviousPage).toBe(true);
      });

      it('should handle single page correctly', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          5,
          0,
          10,
        );

        expect(result.currentPage).toBe(1);
        expect(result.totalPages).toBe(1);
        expect(result.hasNextPage).toBe(false);
        expect(result.hasPreviousPage).toBe(false);
      });

      it('should handle empty results correctly', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          0,
          0,
          10,
        );

        expect(result.currentPage).toBe(1);
        expect(result.totalPages).toBe(1);
        expect(result.hasNextPage).toBe(false);
        expect(result.hasPreviousPage).toBe(false);
        expect(result.data).toEqual([]);
      });

      it('should handle partial last page correctly', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          47,
          40,
          10,
        );

        expect(result.currentPage).toBe(5);
        expect(result.totalPages).toBe(5);
        expect(result.itemsPerPage).toBe(10);
      });
    });

    describe('Edge cases', () => {
      it('should handle large skip values', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          1000,
          990,
          10,
        );

        expect(result.currentPage).toBe(100);
        expect(result.totalPages).toBe(100);
      });

      it('should handle large take values', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          1000,
          0,
          100,
        );

        expect(result.currentPage).toBe(1);
        expect(result.totalPages).toBe(10);
        expect(result.itemsPerPage).toBe(100);
      });

      it('should handle skip larger than total', () => {
        const result = PaginationTransformer.toPaginationResponseDto(
          [],
          50,
          100,
          10,
        );

        expect(result.currentPage).toBe(11);
        expect(result.totalPages).toBe(5);
        expect(result.hasNextPage).toBe(false);
      });

      it('should preserve itemsPerPage even when data is less', () => {
        const data = [{ id: 1 }, { id: 2 }];
        const result = PaginationTransformer.toPaginationResponseDto(
          data,
          2,
          0,
          10,
        );

        expect(result.data).toHaveLength(2);
        expect(result.itemsPerPage).toBe(10); // Should still be 10, not 2
        expect(result.totalPages).toBe(1);
      });
    });

    describe('Validation', () => {
      it('should throw error when take is 0', () => {
        expect(() =>
          PaginationTransformer.toPaginationResponseDto([], 10, 0, 0),
        ).toThrow('Take must be greater than 0');
      });

      it('should throw error when take is negative', () => {
        expect(() =>
          PaginationTransformer.toPaginationResponseDto([], 10, 0, -5),
        ).toThrow('Take must be greater than 0');
      });

      it('should throw error when skip is negative', () => {
        expect(() =>
          PaginationTransformer.toPaginationResponseDto([], 10, -1, 10),
        ).toThrow('Skip must be non-negative');
      });

      it('should throw error when totalItems is negative', () => {
        expect(() =>
          PaginationTransformer.toPaginationResponseDto([], -5, 0, 10),
        ).toThrow('Total items must be non-negative');
      });

      it('should allow skip to be 0', () => {
        expect(() =>
          PaginationTransformer.toPaginationResponseDto([], 10, 0, 10),
        ).not.toThrow();
      });

      it('should allow totalItems to be 0', () => {
        expect(() =>
          PaginationTransformer.toPaginationResponseDto([], 0, 0, 10),
        ).not.toThrow();
      });
    });

    describe('Type safety', () => {
      it('should maintain type information with DTO class', () => {
        const data = [{ id: 1, name: 'John', password: 'secret' }];

        const result = PaginationTransformer.toPaginationResponseDto(
          data,
          1,
          0,
          10,
          MockUserDto,
        );

        // TypeScript should infer the correct type
        const firstUser = result.data[0];
        expect(firstUser).toBeDefined();
        expect(firstUser.id).toBe(1);
        expect(firstUser.name).toBe('John');
      });

      it('should maintain type information with transformer function', () => {
        interface User {
          id: number;
          name: string;
        }

        interface UserDTO {
          userId: number;
          displayName: string;
        }

        const data: User[] = [{ id: 1, name: 'John' }];

        const result = PaginationTransformer.toPaginationResponseDto<
          UserDTO,
          User
        >(data, 1, 0, 10, (user) => ({
          userId: user.id,
          displayName: user.name.toUpperCase(),
        }));

        expect(result.data[0].userId).toBe(1);
        expect(result.data[0].displayName).toBe('JOHN');
      });
    });

    describe('Integration scenarios', () => {
      it('should work with realistic user pagination scenario', () => {
        const users = Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          email: `user${i + 1}@example.com`,
          name: `User ${i + 1}`,
          password: 'hashed_password',
          createdAt: new Date(),
        }));

        const result = PaginationTransformer.toPaginationResponseDto(
          users,
          100,
          10,
          10,
          (user) => ({
            id: user.id,
            email: user.email,
            name: user.name,
          }),
        );

        expect(result.data).toHaveLength(10);
        expect(result.data[0]).not.toHaveProperty('password');
        expect(result.data[0]).not.toHaveProperty('createdAt');
        expect(result.currentPage).toBe(2);
        expect(result.totalPages).toBe(10);
        expect(result.hasNextPage).toBe(true);
        expect(result.hasPreviousPage).toBe(true);
      });

      it('should handle last page with fewer items', () => {
        // Last page with only 3 items (total 23, skip 20, take 10)
        const data = [{ id: 21 }, { id: 22 }, { id: 23 }];

        const result = PaginationTransformer.toPaginationResponseDto(
          data,
          23,
          20,
          10,
        );

        expect(result.data).toHaveLength(3);
        expect(result.currentPage).toBe(3);
        expect(result.totalPages).toBe(3);
        expect(result.hasNextPage).toBe(false);
        expect(result.hasPreviousPage).toBe(true);
      });
    });
  });
});
