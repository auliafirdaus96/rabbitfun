import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { AppError } from './errorHandler';

export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.body);

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      const appError: AppError = new Error(message);
      appError.statusCode = 400;
      appError.isOperational = true;
      return next(appError);
    }

    next();
  };
};

export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.params);

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      const appError: AppError = new Error(message);
      appError.statusCode = 400;
      appError.isOperational = true;
      return next(appError);
    }

    next();
  };
};

export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error } = schema.validate(req.query);

    if (error) {
      const message = error.details.map(detail => detail.message).join(', ');
      const appError: AppError = new Error(message);
      appError.statusCode = 400;
      appError.isOperational = true;
      return next(appError);
    }

    next();
  };
};