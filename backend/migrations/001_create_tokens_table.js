/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('tokens', function(table) {
    table.string('address').primary().comment('Token contract address');
    table.string('name').notNullable().comment('Token name');
    table.string('symbol').notNullable().comment('Token symbol/ticker');
    table.text('description').nullable().comment('Token description');
    table.string('logo_url').nullable().comment('Token logo URL');
    table.string('website').nullable().comment('Project website');
    table.string('twitter').nullable().comment('Twitter handle');
    table.string('telegram').nullable().comment('Telegram group');
    table.string('creator_address').notNullable().index().comment('Token creator address');
    table.string('total_supply').notNullable().comment('Total token supply');
    table.decimal('current_price', 20, 10).defaultTo(0.00000001).comment('Current price in BNB');
    table.decimal('price_change_24h', 10, 2).defaultTo(0).comment('Price change in 24h (%)');
    table.decimal('volume_24h', 20, 10).defaultTo(0).comment('Trading volume in 24h (BNB)');
    table.decimal('market_cap', 20, 10).defaultTo(0).comment('Market cap in BNB');
    table.integer('holders_count').defaultTo(0).comment('Number of token holders');
    table.decimal('liquidity_pool', 20, 10).defaultTo(0).comment('Liquidity pool amount');
    table.decimal('bonding_curve_progress', 5, 2).defaultTo(0).comment('Bonding curve progress (%)');
    table.boolean('is_graduated').defaultTo(false).comment('Has token graduated to DEX');
    table.string('graduation_lp_pair').nullable().comment('LP pair address after graduation');
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('Creation timestamp');
    table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('Last update timestamp');

    // Indexes for performance
    table.index(['symbol']);
    table.index(['creator_address']);
    table.index(['created_at']);
    table.index(['is_graduated']);
    table.index(['bonding_curve_progress']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('tokens');
};