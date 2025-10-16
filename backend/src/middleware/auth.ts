import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler';

export interface AuthenticatedRequest extends Request {
  user?: {
    walletAddress: string;
    id: string;
  };
}

export const authenticate = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error: AppError = new Error('Access token required');
    error.statusCode = 401;
    error.isOperational = true;
    return next(error);
  }

  const token = authHeader.substring(7); // Remove 'Bearer ' prefix

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      walletAddress: decoded.walletAddress,
      id: decoded.id
    };
    next();
  } catch (error) {
    const appError: AppError = new Error('Invalid or expired token');
    appError.statusCode = 401;
    appError.isOperational = true;
    next(appError);
  }
};

export const optionalAuth = (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
    req.user = {
      walletAddress: decoded.walletAddress,
      id: decoded.id
    };
  } catch (error) {
    // Ignore token errors for optional auth
  }

  next();
};