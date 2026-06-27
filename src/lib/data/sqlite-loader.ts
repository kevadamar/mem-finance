import type { SqlJsStatic } from 'sql.js';

let SQL: SqlJsStatic | null = null;

export async function getSQLite(): Promise<SqlJsStatic> {
	if (SQL) return SQL;
	const initSqlJs = (await import('sql.js')).default;
	SQL = await initSqlJs({ locateFile: () => '/sql-wasm.wasm' });
	return SQL;
}
