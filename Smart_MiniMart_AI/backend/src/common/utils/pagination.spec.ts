import { clampPagination } from './pagination';

describe('clampPagination', () => {
  it('normalizes normal page/limit into skip/take', () => {
    expect(clampPagination(2, 20)).toEqual({ page: 2, limit: 20, skip: 20, take: 20 });
  });

  it('clamps limit to max and falls back on garbage input', () => {
    expect(clampPagination('abc', 500)).toEqual({ page: 1, limit: 100, skip: 0, take: 100 });
    expect(clampPagination(-3, 0)).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
    expect(clampPagination(undefined, undefined)).toEqual({ page: 1, limit: 20, skip: 0, take: 20 });
  });

  it('accepts numeric strings from query params', () => {
    expect(clampPagination('3', '10')).toEqual({ page: 3, limit: 10, skip: 20, take: 10 });
  });
});
