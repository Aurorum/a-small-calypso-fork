/**
 * Internal dependencies
 */

import getThemeFilterStringFromTerm from 'state/selectors/get-theme-filter-string-from-term';

/**
 * For a string of terms, recreate full search string in
 * "taxonomy:term taxonomy:term " search-box format, with
 * a trailing space.
 *
 * @param {object} state Global state tree
 * @param {string} terms Space or + separated list of filter terms
 * @returns {string} Complete taxonomy:term filter string, or empty string if term is not valid
 */
export default function prependThemeFilterKeys( state, terms = '' ) {
	const result = terms
		.split( /[+\s]/ )
		.map( term => getThemeFilterStringFromTerm( state, term ) )
		.join( ' ' )
		.trim();

	if ( result ) {
		return result + ' ';
	}
	return '';
}
