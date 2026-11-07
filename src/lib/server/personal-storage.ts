import { env } from '$env/dynamic/private';
import { DEFAULT_EXPENSE_CATEGORIES, DEFAULT_INCOME_CATEGORIES } from '$lib/domain/entities/category';
import { gasRequest } from '$lib/data/gas/gas-client';
import { adminDb, claimStorageSetup, markStorageRecovery, type StorageStatus } from './storage-ownership';

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
export { DRIVE_SCOPE };

async function googlePost<T>(url: string, token: string, body: unknown, method = 'POST'): Promise<T> {
	const response = await fetch(url, {
		method,
		headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
		body: JSON.stringify(body),
		signal: AbortSignal.timeout(15000)
	});
	if (!response.ok) throw new Error(`Google API request failed (${response.status})`);
	return response.json() as Promise<T>;
}

async function findExisting(name: string, token: string, ownerEmail: string): Promise<string | null> {
	const q = encodeURIComponent(`name = '${name}' and mimeType = 'application/vnd.google-apps.spreadsheet' and trashed = false`);
	const response = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,owners(emailAddress))&pageSize=10`, {
		headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000)
	});
	if (!response.ok) throw new Error('Could not reconcile an earlier Google spreadsheet attempt');
	const json = await response.json() as { files?: { id: string; owners?: { emailAddress?: string }[] }[] };
	if ((json.files?.length ?? 0) > 1) throw new Error('Multiple personal spreadsheets need manual recovery');
	if (json.files?.[0] && json.files[0].owners?.[0]?.emailAddress?.toLowerCase() !== ownerEmail) throw new Error('Personal spreadsheet owner mismatch');
	return json.files?.[0]?.id ?? null;
}

async function ensureAdminEditor(sheetId: string, token: string, adminEmail: string): Promise<void> {
	const response = await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(sheetId)}/permissions?fields=permissions(emailAddress,role)`, {
		headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000)
	});
	if (!response.ok) throw new Error('Could not inspect spreadsheet sharing');
	const json = await response.json() as { permissions?: { emailAddress?: string; role: string }[] };
	if (json.permissions?.some((permission) => permission.emailAddress?.toLowerCase() === adminEmail && ['writer', 'owner'].includes(permission.role))) return;
	await googlePost(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(sheetId)}/permissions?fields=id&sendNotificationEmail=false`, token, {
		type: 'user', role: 'writer', emailAddress: adminEmail
	});
}

async function seedSpreadsheet(sheetId: string, token: string): Promise<void> {
	const categories = [...DEFAULT_EXPENSE_CATEGORIES, ...DEFAULT_INCOME_CATEGORIES];
	await googlePost(`https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(sheetId)}/values:batchUpdate`, token, {
		valueInputOption: 'RAW',
		data: [
			{ range: 'transactions!A1:J1', values: [['id', 'type', 'amount', 'categoryId', 'date', 'note', 'createdAt', 'updatedAt', 'flagActive', 'userId']] },
			{ range: 'budgets!A1:H1', values: [['id', 'categoryId', 'amount', 'month', 'year', 'createdAt', 'flagActive', 'userId']] },
			{ range: 'categories!A1:H27', values: [
				['id', 'name', 'type', 'color', 'icon', 'isDefault', 'flagActive', 'userId'],
				...categories.map((category) => [crypto.randomUUID(), category.name, category.type, category.color, category.icon, true, true, ''])
			] }
		]
	});
}

export async function createPersonalSpreadsheet(userId: string, googleEmail: string, token: string) {
	const adminEmail = env.GOOGLE_ADMIN_EMAIL?.trim().toLowerCase();
	if (!adminEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) throw new Error('Google admin account is not configured');
	if (!token) throw new Error('Google Drive permission was not granted');
	const identityResponse = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
		headers: { Authorization: `Bearer ${token}` }, signal: AbortSignal.timeout(15000)
	});
	if (!identityResponse.ok) throw new Error('Could not verify Google account');
	const identity = await identityResponse.json() as { email?: string; email_verified?: boolean };
	if (!identity.email_verified || identity.email?.toLowerCase() !== googleEmail) throw new Error('Google account identity mismatch');
	let profile: { ga_sheet_id?: string | null; storage_status?: string | null; google_owner_email?: string | null; storage_initialized?: boolean } | null;
	const { data: readData, error: readError } = await adminDb().from('user_profiles')
		.select('ga_sheet_id,storage_status,google_owner_email,storage_initialized').eq('id', userId).maybeSingle();
	if (readError && (readError.code === '42703' || readError.message?.includes('storage_status'))) {
		const { data: legacyData, error: legacyErr } = await adminDb().from('user_profiles').select('ga_sheet_id').eq('id', userId).maybeSingle();
		if (legacyErr) throw new Error('Profile unavailable');
		profile = legacyData ? { ...legacyData, storage_status: 'ADMIN_OWNED', google_owner_email: null, storage_initialized: true } : null;
	} else if (readError) {
		throw new Error('Profile unavailable');
	} else {
		profile = readData;
	}
	if (profile?.ga_sheet_id && profile.storage_status !== 'ACCESS_RECOVERY') return { status: (profile.storage_status || 'ADMIN_OWNED') as StorageStatus };
	if (profile?.ga_sheet_id && profile.google_owner_email?.toLowerCase() !== googleEmail) throw new Error('Google account does not match the file owner');
	if (!profile?.ga_sheet_id && !await claimStorageSetup(userId, 'personal')) throw new Error('Spreadsheet setup is already running');

	let sheetId: string | null = profile?.ga_sheet_id ?? null;
	try {
		const name = `MemFinance_${userId}`;
		if (!sheetId) sheetId = await findExisting(name, token, googleEmail);
		if (!sheetId) {
			const created = await googlePost<{ spreadsheetId: string }>('https://sheets.googleapis.com/v4/spreadsheets', token, {
				properties: { title: name },
				sheets: ['transactions', 'categories', 'budgets'].map((title) => ({ properties: { title } }))
			});
			sheetId = created.spreadsheetId;
			if (!sheetId) throw new Error('Google did not return a spreadsheet ID');
		}
		const { data: saved, error: saveError } = await adminDb().from('user_profiles').update({
			ga_sheet_id: sheetId, storage_status: 'ACCESS_RECOVERY', google_owner_email: googleEmail
		}).eq('id', userId).is('ga_sheet_id', null).select('ga_sheet_id').maybeSingle();
		if (saveError || (!profile?.ga_sheet_id && saved?.ga_sheet_id !== sheetId)) throw new Error('Could not record personal spreadsheet');
		if (!profile?.storage_initialized) {
			await seedSpreadsheet(sheetId, token);
			const { error: initializedError } = await adminDb().from('user_profiles').update({ storage_initialized: true }).eq('id', userId).eq('ga_sheet_id', sheetId);
			if (initializedError) throw new Error('Could not record spreadsheet initialization');
		}

		await ensureAdminEditor(sheetId, token, adminEmail);
		const verified = await gasRequest<{ ownerEmail: string; adminEmail: string; adminRole: string }>('transfer_status', '', { sheetId, targetEmail: googleEmail });
		if (!verified.success || verified.data?.ownerEmail?.toLowerCase() !== googleEmail || verified.data?.adminEmail?.toLowerCase() !== adminEmail || verified.data?.adminRole !== 'writer') {
			throw new Error('Could not verify owner and application editor access');
		}
		const { error: completeError } = await adminDb().from('user_profiles').update({
			storage_status: 'USER_OWNED_ADMIN_EDITOR', ownership_verified_at: new Date().toISOString()
		}).eq('id', userId).eq('ga_sheet_id', sheetId);
		if (completeError) throw new Error('Could not confirm personal spreadsheet');
		return { status: 'USER_OWNED_ADMIN_EDITOR' as const };
	} catch (error) {
		await markStorageRecovery(userId);
		throw error;
	}
}
