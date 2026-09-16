import { integer, primaryKey, sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const farms = sqliteTable('farms', {
  userId: text('user_id').primaryKey(),
  stateJson: text('state_json').notNull(),
  revision: integer('revision').notNull().default(0),
  updatedAt: integer('updated_at').notNull(),
});
export const farmRequests = sqliteTable('farm_requests', {
  userId: text('user_id').notNull(),
  requestId: text('request_id').notNull(),
  resultsJson: text('results_json').notNull(),
  createdAt: integer('created_at').notNull(),
}, table => [primaryKey({ columns: [table.userId, table.requestId] })]);
