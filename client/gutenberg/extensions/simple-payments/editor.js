/** @format */

/**
 * External dependencies
 */
import { Path, SVG } from '@wordpress/components';

/**
 * Internal dependencies
 */
import edit from './edit';
import save from './save';
import { __, _x } from 'gutenberg/extensions/presets/jetpack/utils/i18n';
import registerJetpackBlock from 'gutenberg/extensions/presets/jetpack/utils/register-jetpack-block';

/**
 * Styles
 */
import './editor.scss';

export const name = 'simple-payments';

export const settings = {
	title: __( 'Simple Payments button' ),

	description: __(
		'Lets you create and embed credit and debit card payment buttons with minimal setup.'
	),

	icon: (
		<SVG xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
			<Path fill="none" d="M0 0h24v24H0V0z" />
			<Path d="M20 4H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4v-6h16v6zm0-10H4V6h16v2z" />
		</SVG>
	),

	category: 'jetpack',

	keywords: [ _x( 'shop', 'block search term' ), _x( 'sell', 'block search term' ), 'PayPal' ],

	attributes: {
		paymentId: {
			type: 'number',
		},
		formValues: {
			type: 'object',
		},
	},

	transforms: {
		from: [
			{
				type: 'shortcode',
				tag: 'simple-payment',
				attributes: {
					paymentId: {
						type: 'number',
						shortcode: ( { named: { id } } ) => {
							if ( ! id ) {
								return;
							}

							const result = parseInt( id, 10 );
							if ( result ) {
								return result;
							}
						},
					},
				},
			},
		],
	},

	edit,

	save,

	supports: {
		className: false,
		customClassName: false,
		html: false,
	},
};

registerJetpackBlock( name, settings );
