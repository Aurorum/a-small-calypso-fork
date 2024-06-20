interface ReferralPurchaseAPIResponse {
	status: string;
	product_id: number;
	quantity: number;
	license: {
		license_key: string;
		attached_at: string | null;
		revoked_at: string | null;
	};
	site_assigned: string;
}
export interface ReferralPurchase extends ReferralPurchaseAPIResponse {
	status: string;
	referral_id: number;
}
export interface ReferralClient {
	id: number;
	email: string;
}
export interface Referral {
	id: string;
	client: ReferralClient;
	purchases: ReferralPurchase[];
	commissions: number;
	statuses: string[];
}

export interface ReferralAPIResponse {
	id: number;
	client: ReferralClient;
	products: ReferralPurchaseAPIResponse[];
	commission: number;
	status: string;
}
