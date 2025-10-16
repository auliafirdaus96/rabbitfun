import Joi from 'joi';

// Token creation validation
export const createTokenSchema = Joi.object({
  name: Joi.string().min(1).max(100).required().messages({
    'string.empty': 'Token name is required',
    'string.max': 'Token name cannot exceed 100 characters',
    'any.required': 'Token name is required'
  }),
  symbol: Joi.string().min(1).max(10).required().messages({
    'string.empty': 'Token symbol is required',
    'string.max': 'Token symbol cannot exceed 10 characters',
    'any.required': 'Token symbol is required'
  }),
  metadata: Joi.string().uri().allow('').optional().messages({
    'string.uri': 'Metadata must be a valid URI'
  }),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required().messages({
    'string.pattern.base': 'Invalid wallet address format',
    'any.required': 'Wallet address is required'
  })
});

// Token address validation
export const tokenAddressSchema = Joi.object({
  tokenAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required().messages({
    'string.pattern.base': 'Invalid token address format',
    'any.required': 'Token address is required'
  })
});

// Buy tokens validation
export const buyTokensSchema = Joi.object({
  tokenAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required().messages({
    'string.pattern.base': 'Invalid token address format',
    'any.required': 'Token address is required'
  }),
  bnbAmount: Joi.string().pattern(/^\d+(\.\d+)?$/).min(1).required().messages({
    'string.pattern.base': 'Invalid BNB amount format',
    'string.min': 'BNB amount must be greater than 0',
    'any.required': 'BNB amount is required'
  }),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required().messages({
    'string.pattern.base': 'Invalid wallet address format',
    'any.required': 'Wallet address is required'
  })
});

// Sell tokens validation
export const sellTokensSchema = Joi.object({
  tokenAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required().messages({
    'string.pattern.base': 'Invalid token address format',
    'any.required': 'Token address is required'
  }),
  tokenAmount: Joi.string().pattern(/^\d+(\.\d+)?$/).min(1).required().messages({
    'string.pattern.base': 'Invalid token amount format',
    'string.min': 'Token amount must be greater than 0',
    'any.required': 'Token amount is required'
  }),
  walletAddress: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).required().messages({
    'string.pattern.base': 'Invalid wallet address format',
    'any.required': 'Wallet address is required'
  })
});

// Pagination validation
export const paginationSchema = Joi.object({
  page: Joi.number().integer().min(1).default(1).messages({
    'number.base': 'Page must be a number',
    'number.integer': 'Page must be an integer',
    'number.min': 'Page must be at least 1'
  }),
  limit: Joi.number().integer().min(1).max(100).default(20).messages({
    'number.base': 'Limit must be a number',
    'number.integer': 'Limit must be an integer',
    'number.min': 'Limit must be at least 1',
    'number.max': 'Limit cannot exceed 100'
  }),
  sortBy: Joi.string().valid('createdAt', 'marketCap', 'totalBNB').default('createdAt').messages({
    'any.only': 'Invalid sort field'
  }),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc').messages({
    'any.only': 'Sort order must be asc or desc'
  })
});

// Query parameters for token info
export const tokenQuerySchema = Joi.object({
  address: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional().messages({
    'string.pattern.base': 'Invalid token address format'
  }),
  creator: Joi.string().pattern(/^0x[a-fA-F0-9]{40}$/).optional().messages({
    'string.pattern.base': 'Invalid creator address format'
  }),
  graduated: Joi.boolean().optional().messages({
    'boolean.base': 'Graduated must be a boolean'
  })
});