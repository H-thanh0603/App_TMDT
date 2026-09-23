import { parseDurationSeconds } from './duration';

describe('parseDurationSeconds (SEC-021 refresh token TTL)', () => {
  it('parses supported units', () => {
    expect(parseDurationSeconds('30s', 1)).toBe(30);
    expect(parseDurationSeconds('15m', 1)).toBe(900);
    expect(parseDurationSeconds('2h', 1)).toBe(7_200);
    expect(parseDurationSeconds('14d', 1)).toBe(1_209_600);
    expect(parseDurationSeconds('1w', 1)).toBe(604_800);
  });

  it('treats a bare number as seconds and tolerates whitespace/case', () => {
    expect(parseDurationSeconds(' 3600 ', 1)).toBe(3_600);
    expect(parseDurationSeconds('15M', 1)).toBe(900);
  });

  it('falls back when the value is missing or invalid', () => {
    expect(parseDurationSeconds(undefined, 42)).toBe(42);
    expect(parseDurationSeconds(null, 42)).toBe(42);
    expect(parseDurationSeconds('', 42)).toBe(42);
    expect(parseDurationSeconds('forever', 42)).toBe(42);
    expect(parseDurationSeconds('-5m', 42)).toBe(42);
    expect(parseDurationSeconds('0m', 42)).toBe(42);
  });
});
