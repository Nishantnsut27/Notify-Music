import { Request, Response, NextFunction } from 'express';

export function errorHandlerMiddleware(err: any, _req: Request, res: Response, _next: NextFunction): void {
  console.error('[BackendServerError]', err.name || 'Error', err.message || err);

  const statusCode = err.statusCode || err.status || 500;
  const errorMessage = err.message || 'An internal server error occurred while processing your request.';

  res.status(statusCode).json({
    success: false,
    error: errorMessage,
  });
}
