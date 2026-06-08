import { BadRequestException } from '@nestjs/common';
import { createZodValidationPipe } from 'nestjs-zod';

type ZodIssueLike = {
  code: string;
  message: string;
  path?: Array<string | number>;
};

type ValidationErrorDetail = {
  field: string;
  message: string;
  code: string;
};

const formatPath = (path: Array<string | number> = []) =>
  path.length > 0 ? path.join('.') : 'body';

const getIssues = (error: unknown): ZodIssueLike[] => {
  if (
    error &&
    typeof error === 'object' &&
    'issues' in error &&
    Array.isArray((error as { issues?: unknown }).issues)
  ) {
    return (error as { issues: ZodIssueLike[] }).issues;
  }

  return [];
};

const formatIssue = (issue: ZodIssueLike): ValidationErrorDetail => {
  const field = formatPath(issue.path);

  return {
    field,
    message: `${field}: ${issue.message}`,
    code: issue.code,
  };
};

export const AppZodValidationPipe = createZodValidationPipe({
  createValidationException: (error: unknown) => {
    const errors = getIssues(error).map(formatIssue);
    const messages = errors.map((item) => item.message);

    return new BadRequestException({
      statusCode: 400,
      message: messages.length > 0 ? messages : ['Validation failed'],
      errors,
    });
  },
});
