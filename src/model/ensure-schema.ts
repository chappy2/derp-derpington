/**
 * Creates/updates tables for:
 * - users
 * - steam_accounts
 * - games
 * - ownership
 * - prefs
 */
export const ensureSchema = async (db) => {

    const isSqlite = process.env.NODE_ENV === 'test';

    // users
    if (!(await db.schema.hasTable('users'))) {
        await db.schema.createTable('users', (t) => {
            t.string('discord_user_id', 20).primary();
            t.string('timezone', 50).nullable();
            t.timestamp('created_at').defaultTo(db.fn.now());
        });
        await safeIndex(db, 'users', ['timezone'], 'idx_users_timezone');
    }

    // steam_accounts (1:1 users)
    if (!(await db.schema.hasTable('steam_accounts'))) {
        await db.schema.createTable('steam_accounts', (t) => {
            t.string('discord_user_id', 20).primary().references('users.discord_user_id').onDelete('CASCADE');
            t.string('steam_id64', 32).notNullable().unique();
            t.string('vanity', 255).nullable();
            t.boolean('privacy_ok').notNullable().defaultTo(false);
            t.timestamp('linked_at').defaultTo(db.fn.now());
        });
    }

    // games (catalog)
    if (!(await db.schema.hasTable('games'))) {
        await db.schema.createTable('games', (t) => {
            t.integer('app_id').primary();
            t.string('name', 255).notNullable();
            t.string('type', 50).nullable();
            t.boolean('is_free').notNullable().defaultTo(false);
            // JSON not native on SQLite → use TEXT there
            if (isSqlite) t.text('tags_json'); else t.json('tags_json');
            t.integer('players_min').nullable();
            t.integer('players_max').nullable();
            t.boolean('crossplay').nullable();
            t.integer('price_cents').nullable();
            t.integer('rating').nullable(); // 0-100
            t.timestamp('rating_updated_at').nullable();
            t.timestamp('game_details_updated_at').defaultTo(db.fn.now());
            t.string('currency', 3).nullable();
        });
        await safeIndex(db, 'games', ['is_free'], 'idx_games_is_free');
        await safeIndex(db, 'games', ['players_min', 'players_max'], 'idx_games_players_range');
    }

    // ownership (many-to-many)
    if (!(await db.schema.hasTable('ownership'))) {
        await db.schema.createTable('ownership', (t) => {
            t.string('discord_user_id', 20).notNullable()
                .references('users.discord_user_id').onDelete('CASCADE');
            t.integer('app_id').notNullable()
                .references('games.app_id').onDelete('CASCADE');
            t.integer('playtime_forever').nullable(); // minutes
            t.dateTime('last_played').nullable();
            t.timestamp('updated_at').defaultTo(db.fn.now());
            t.primary(['discord_user_id', 'app_id']);
        });
        await safeIndex(db, 'ownership', ['app_id'], 'idx_ownership_app_id');
        await safeIndex(db, 'ownership', ['discord_user_id'], 'idx_ownership_discord_user_id');
    }

    // prefs (1:1 users)
    if (!(await db.schema.hasTable('prefs'))) {
        await db.schema.createTable('prefs', (t) => {
            t.string('discord_user_id', 20).primary()
                .references('users.discord_user_id').onDelete('CASCADE');
            t.string('genre', 100).nullable();
            t.integer('min_players').nullable();
            t.integer('max_players').nullable();
            t.boolean('crossplay').nullable();
            t.integer('budget_cents').nullable();
        });
    }
}

/** Create index if it’s not already there (works for MySQL & SQLite) */
const safeIndex = async (db, table, columns, name) => {
    const client = db.client.config.client;
    try {
        if (client === 'sqlite3') {
            // SQLite: check pragma for existing index
            const existing = await db.raw(`PRAGMA index_list(${table});`);
            const found = Array.isArray(existing) ? existing[0] : existing; // knex returns driver-specific shapes
            const list = Array.isArray(found) ? found : (found?.[0] || []);
            if (!list.some((r) => (r.name || r.idx || '').toLowerCase() === name.toLowerCase())) {
                await db.schema.alterTable(table, (t) => t.index(columns, name));
            }
        } else {
            // MySQL: try create; ignore if exists
            await db.schema.alterTable(table, (t) => t.index(columns, name));
        }
    } catch {
        // ignore duplicate index errors across drivers
    }
}

