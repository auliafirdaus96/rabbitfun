/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.up = function(knex) {
  return knex.schema.createTable('users', function(table) {
    table.string('address').primary().comment('User wallet address');
    table.string('username').nullable().unique().comment('Username');
    table.string('email').nullable().unique().comment('Email address');
    table.text('bio').nullable().comment('User bio');
    table.string('avatar_url').nullable().comment('Avatar URL');
    table.boolean('is_verified').defaultTo(false).comment('Verification status');
    table.boolean('is_active').defaultTo(true).comment('Account active status');
    table.timestamp('last_login_at').nullable().comment('Last login timestamp');
    table.timestamp('created_at').defaultTo(knex.fn.now()).comment('Account creation timestamp');
    table.timestamp('updated_at').defaultTo(knex.fn.now()).comment('Last update timestamp');

    // Indexes for performance
    table.index(['username']);
    table.index(['email']);
    table.index(['is_active']);
    table.index(['created_at']);
  });
};

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
exports.down = function(knex) {
  return knex.schema.dropTable('users');
};