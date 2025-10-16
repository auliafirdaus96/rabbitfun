/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('transactions', function(table) {
    table.string('hash').primary().comment('Transaction hash');
    table.string('token_address').notNullable().index().comment('Related token address');
    table.string('from_address').notNullable().index().comment('Sender address');
    table.string('to_address').nullable().index().comment('Receiver address');
    table.enu('type', ['buy', 'sell']).notNullable().comment('Transaction type');
    table.decimal('amount_bnb', 20, 10).notNullable().comment('Amount in BNB');
    table.decimal('amount_tokens', 30, 0).notNullable().comment('Amount of tokens');
    table.decimal('price_per_token', 20, 10).notNullable().comment('Price per token in BNB');
    table.decimal('gas_used', 20, 0).nullable().comment('Gas used');
    table.decimal('gas_price', 20, 0).nullable().comment('Gas price');
    table.string('block_hash').nullable().comment('Block hash');
    table.integer('block_number').nullable().index().comment('Block number');
    table.timestamp('timestamp').defaultTo(knex.fn.now()).index().comment('Transaction timestamp');

    // Foreign key constraint
    table.foreign('token_address').references('address').inTable('tokens').onDelete('CASCADE');

    // Indexes for performance
    table.index(['from_address']);
    table.index(['to_address']);
    table.index(['type']);
    table.index(['timestamp']);
    table.index(['token_address', 'timestamp']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('transactions');
};