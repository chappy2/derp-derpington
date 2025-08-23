import knex from 'knex';
import { ensureSchema } from './ensure-schema.js';

export const getDB = async () => {
    const db = process.env.NODE_ENV === 'test'
        ? knex({
            client: 'sqlite3',
            connection: { filename: ':memory:' },
            useNullAsDefault: true,
        })
        : knex({
            client: 'mysql2',
            connection: {
                host: process.env.DB_HOST!,
                user: process.env.DB_USER!,
                password: process.env.DB_PASSWORD!,
                database: process.env.DB_NAME!,
                port: Number(process.env.DB_PORT ?? 3306),
            },
        });
    await ensureSchema(db);
    return db;
}
export const dbInstance = await getDB();



