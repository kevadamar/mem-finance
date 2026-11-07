import { createClient, type User } from '@supabase/supabase-js';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';
import { env } from '$env/dynamic/private';
import { gasRequest } from '$lib/data/gas/gas-client';
import { classifyStorageStatus } from './storage-status';

export type StorageStatus = 'CHOICE_REQUIRED' | 'SETUP_IN_PROGRESS' | 'ADMIN_OWNED' | 'TRANSFER_PENDING' | 'USER_OWNED_ADMIN_EDITOR' | 'ACCESS_RECOVERY' | 'SETUP_ERROR';

export function googleIdentityEmail(user: User | null): string | null {
	const identity = user?.identities?.find((entry) => entry.provider === 'google');
	const email = identity?.identity_data?.email;
	return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email.toLowerCase() : null;
}

export function adminDb() {
	if (!PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) throw new Error('Supabase admin configuration unavailable');
	return createClient(PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
		auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
	}).schema('memfinance');
}

export async function claimStorageSetup(userId: string, mode: 'admin' | 'personal'): Promise<boolean> {
	const db = adminDb();
	const staleBefore = new Date(Date.now() - 15 * 60_000).toISOString();
	try {
		await db.from('user_profiles').update({ storage_status: 'ACCESS_RECOVERY' })
			.eq('id', userId).eq('storage_status', 'SETUP_IN_PROGRESS').eq('setup_mode', 'personal').lt('setup_started_at', staleBefore).is('ga_sheet_id', null);
		await db.from('user_profiles').update({ storage_status: 'SETUP_ERROR' })
			.eq('id', userId).eq('storage_status', 'SETUP_IN_PROGRESS').eq('setup_mode', 'admin').lt('setup_started_at', staleBefore).is('ga_sheet_id', null);
		const { data, error } = await db.from('user_profiles').update({
			storage_status: 'SETUP_IN_PROGRESS', setup_mode: mode, setup_started_at: new Date().toISOString()
		}).eq('id', userId).is('ga_sheet_id', null)
			.in('storage_status', ['CHOICE_REQUIRED', 'SETUP_ERROR', 'ACCESS_RECOVERY'])
			.select('id').maybeSingle();
		if (error) {
			if (error.code === '42703' || error.message?.includes('storage_status')) return true;
			throw new Error('Could not reserve spreadsheet setup');
		}
		return !!data;
	} catch (err) {
		if (err instanceof Error && err.message === 'Could not reserve spreadsheet setup') throw err;
		return true;
	}
}

export async function markStorageSetupError(userId: string): Promise<void> {
	try {
		await adminDb().from('user_profiles').update({ storage_status: 'SETUP_ERROR' })
			.eq('id', userId).eq('storage_status', 'SETUP_IN_PROGRESS').is('ga_sheet_id', null);
	} catch {
		// Ignore if column doesn't exist
	}
}

export async function markStorageRecovery(userId: string): Promise<void> {
	try {
		await adminDb().from('user_profiles').update({ storage_status: 'ACCESS_RECOVERY' })
			.eq('id', userId).eq('storage_status', 'SETUP_IN_PROGRESS').is('ga_sheet_id', null);
	} catch {
		// Ignore if column doesn't exist
	}
}

export async function createAdminFallback(userId: string) {
	const db = adminDb();
	let profile: { ga_sheet_id?: string | null; storage_status?: string | null } | null;
	const { data, error } = await db.from('user_profiles').select('ga_sheet_id,storage_status').eq('id', userId).maybeSingle();
	if (error && (error.code === '42703' || error.message?.includes('storage_status'))) {
		const { data: legacyData, error: legacyErr } = await db.from('user_profiles').select('ga_sheet_id').eq('id', userId).maybeSingle();
		if (legacyErr) throw new Error('Profile unavailable');
		profile = legacyData;
	} else if (error) {
		throw new Error('Profile unavailable');
	} else {
		profile = data;
	}

	if (profile?.ga_sheet_id) return { status: (profile.storage_status as StorageStatus) || 'ADMIN_OWNED' };
	if (profile?.storage_status === 'ACCESS_RECOVERY') throw new Error('Personal spreadsheet recovery must finish before using admin storage');
	if (!await claimStorageSetup(userId, 'admin')) throw new Error('Spreadsheet setup is already running');
	try {
		const result = await gasRequest<{ gaSheetId: string }>('create_sheet', '', { userId });
		if (!result.success || !result.data?.gaSheetId) throw new Error('Admin spreadsheet creation failed');

		const { data: saved, error: saveError } = await db.from('user_profiles').update({
			ga_sheet_id: result.data.gaSheetId, storage_status: 'ADMIN_OWNED', storage_initialized: true, updated_at: new Date().toISOString()
		}).eq('id', userId).is('ga_sheet_id', null).select('ga_sheet_id').maybeSingle();

		if (saveError && (saveError.code === '42703' || saveError.message?.includes('storage_status'))) {
			const { data: legacySaved, error: legacySaveErr } = await db.from('user_profiles').update({
				ga_sheet_id: result.data.gaSheetId,
				updated_at: new Date().toISOString()
			}).eq('id', userId).is('ga_sheet_id', null).select('ga_sheet_id').maybeSingle();
			if (legacySaveErr || legacySaved?.ga_sheet_id !== result.data.gaSheetId) throw new Error('Could not save admin spreadsheet');
		} else if (saveError || saved?.ga_sheet_id !== result.data.gaSheetId) {
			throw new Error('Could not save admin spreadsheet');
		}
		return { status: 'ADMIN_OWNED' as StorageStatus };
	} catch (error) {
		await markStorageSetupError(userId);
		throw error;
	}
}

export async function storageProfile(userId: string) {
	const db = adminDb();
	const { data, error } = await db.from('user_profiles')
		.select('ga_sheet_id,storage_status,google_owner_email,transfer_requested_at,storage_initialized')
		.eq('id', userId).maybeSingle();
	if (error && (error.code === '42703' || error.message?.includes('storage_status'))) {
		const { data: legacyData, error: legacyErr } = await db.from('user_profiles')
			.select('ga_sheet_id')
			.eq('id', userId).maybeSingle();
		if (legacyErr || !legacyData?.ga_sheet_id) throw new Error('Spreadsheet unavailable');
		return {
			ga_sheet_id: legacyData.ga_sheet_id,
			storage_status: 'ADMIN_OWNED' as StorageStatus,
			google_owner_email: null,
			transfer_requested_at: null,
			storage_initialized: true
		};
	}
	if (error || !data?.ga_sheet_id) throw new Error('Spreadsheet unavailable');
	return data;
}

export async function verifyStorage(userId: string) {
	const db = adminDb();
	const { data: incomplete, error: incompleteError } = await db.from('user_profiles')
		.select('ga_sheet_id,storage_status,google_owner_email').eq('id', userId).maybeSingle();
	if (incompleteError && (incompleteError.code === '42703' || incompleteError.message?.includes('storage_status'))) {
		const { data: legacy } = await db.from('user_profiles').select('ga_sheet_id').eq('id', userId).maybeSingle();
		return { status: (legacy?.ga_sheet_id ? 'ADMIN_OWNED' : 'CHOICE_REQUIRED') as StorageStatus, targetEmail: null };
	}
	if (incomplete && !incomplete.ga_sheet_id) return { status: incomplete.storage_status as StorageStatus, targetEmail: incomplete.google_owner_email };
	const profile = await storageProfile(userId);
	if (!profile.google_owner_email) return { status: (profile.storage_status as StorageStatus) || 'ADMIN_OWNED', targetEmail: null };
	const result = await gasRequest<{ ownerEmail: string; adminEmail: string; adminRole: string; pendingOwner: boolean }>(
		'transfer_status', '', { sheetId: profile.ga_sheet_id, targetEmail: profile.google_owner_email }
	);
	if (!result.success || !result.data) throw new Error('Could not verify Google Drive ownership');
	const status = classifyStorageStatus({ ...result.data, targetEmail: profile.google_owner_email, initialized: profile.storage_initialized });
	try {
		await db.from('user_profiles').update({
			storage_status: status,
			ownership_verified_at: new Date().toISOString()
		}).eq('id', userId).eq('ga_sheet_id', profile.ga_sheet_id);
	} catch {
		// Ignore if column doesn't exist
	}
	return { status, targetEmail: profile.google_owner_email };
}

export async function initiateStorageTransfer(userId: string, user: User | null) {
	const targetEmail = googleIdentityEmail(user);
	if (!targetEmail) throw new Error('Hubungkan akun Google terlebih dahulu.');
	const profile = await storageProfile(userId);
	if (profile.storage_status === 'USER_OWNED_ADMIN_EDITOR') return { status: 'USER_OWNED_ADMIN_EDITOR' as StorageStatus, targetEmail };
	if (profile.storage_status === 'TRANSFER_PENDING') return verifyStorage(userId);
	if (profile.transfer_requested_at && Date.now() - Date.parse(profile.transfer_requested_at) < 60 * 60 * 1000) {
		throw new Error('Tunggu satu jam sebelum mengirim undangan transfer lagi.');
	}
	const result = await gasRequest<{ pendingOwner: boolean }>('transfer_sheet', '', { sheetId: profile.ga_sheet_id, targetEmail });
	if (!result.success || !result.data?.pendingOwner) throw new Error('Google Drive belum dapat menerima permintaan transfer ini.');
	try {
		await adminDb().from('user_profiles').update({
			storage_status: 'TRANSFER_PENDING', google_owner_email: targetEmail,
			transfer_requested_at: new Date().toISOString()
		}).eq('id', userId).eq('ga_sheet_id', profile.ga_sheet_id);
	} catch {
		// Ignore if column doesn't exist
	}
	return { status: 'TRANSFER_PENDING' as StorageStatus, targetEmail };
}
