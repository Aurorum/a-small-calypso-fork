import { DataViewsPaginationInfo } from 'calypso/a8c-for-agencies/components/items-dashboard/items-dataviews/interfaces';
import type { SiteExcerptData } from '@automattic/sites';

const SORT_KEY_MAP = {
	site: 'alphabetically',
	'last-publish': 'updatedAt',
};

export function mapFieldIdToSortKey( fieldId: string ) {
	return SORT_KEY_MAP[ fieldId as keyof typeof SORT_KEY_MAP ] ?? fieldId;
}

export function getSitesPagination(
	allSites: SiteExcerptData[],
	perPage: number
): DataViewsPaginationInfo {
	const totalItems = allSites.length;
	const totalPages = Math.ceil( totalItems / perPage );

	return { totalItems, totalPages };
}
