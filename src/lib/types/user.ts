export interface UserMetaData {
	iss?: string;
	sub?: string;
	name?: string;
	email?: string;
	picture?: string;
	full_name?: string;
	avatar_url?: string;
	provider_id?: string;
	email_verified?: boolean;
	phone_verified?: boolean;
	[key: string]: unknown;
}

export interface AppUser {
	id: string;
	email: string;
	banned_until: string | null;
	created_at: string;
	confirmed_at: string;
	confirmation_sent_at: string | null;
	is_anonymous: boolean;
	is_sso_user: boolean;
	invited_at: string | null;
	last_sign_in_at: string;
	phone: string | null;
	raw_app_meta_data: {
		provider: string;
		providers: string[];
	};
	raw_user_meta_data: UserMetaData;
	user_metadata: UserMetaData;
	app_metadata: {
		provider: string;
		providers: string[];
	};
	aud: string;
	role: string;
	updated_at: string;
	providers: string[];
}
