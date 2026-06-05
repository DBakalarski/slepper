// SQLSTATE codes z Postgres. Stabilny kontrakt (definicje w SQL standard).
export const POSTGRES_UNIQUE_VIOLATION = '23505';
export const POSTGRES_RAISE_EXCEPTION = 'P0001';

interface ErrorWithCode {
  code: string;
}

function hasErrorCode(error: unknown): error is ErrorWithCode {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

export function isUniqueViolation(error: unknown): boolean {
  return hasErrorCode(error) && error.code === POSTGRES_UNIQUE_VIOLATION;
}

export function isRaiseException(error: unknown): boolean {
  return hasErrorCode(error) && error.code === POSTGRES_RAISE_EXCEPTION;
}
