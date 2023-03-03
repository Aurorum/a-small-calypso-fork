import { recordTracksEvent } from '@automattic/calypso-analytics';
import { isFreePlanProduct } from '@automattic/calypso-products';
import { Button, Card, Spinner } from '@automattic/components';
import { useDomainSuggestions } from '@automattic/domain-picker/src';
import { useLocale } from '@automattic/i18n-utils';
import { useShoppingCart } from '@automattic/shopping-cart';
import { useTranslate } from 'i18n-calypso';
import page from 'page';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import TrackComponentView from 'calypso/lib/analytics/track-component-view';
import { domainRegistration } from 'calypso/lib/cart-values/cart-items';
import { addQueryArgs } from 'calypso/lib/url';
import CalypsoShoppingCartProvider from 'calypso/my-sites/checkout/calypso-shopping-cart-provider';
import useCartKey from 'calypso/my-sites/checkout/use-cart-key';
import { isCurrentUserEmailVerified } from 'calypso/state/current-user/selectors';
import isSiteOnMonthlyPlan from 'calypso/state/selectors/is-site-on-monthly-plan';
import { getDomainsBySiteId } from 'calypso/state/sites/domains/selectors';
import { getSelectedSite, getSelectedSiteSlug } from 'calypso/state/ui/selectors';

import './style.scss';

export default function DomainUpsell() {
	const site = useSelector( ( state ) => getSelectedSite( state ) );
	const isEmailVerified = useSelector( ( state ) => isCurrentUserEmailVerified( state ) );
	const siteDomains = useSelector( ( state ) => getDomainsBySiteId( state, site.ID ) );
	const isMonthlyPlan = useSelector( ( state ) => isSiteOnMonthlyPlan( state, site.ID ) );
	const isFreePlan = isFreePlanProduct( site.plan );

	if (
		siteDomains.filter( ( domain ) => ! domain.isWPCOMDomain ).length ||
		! isEmailVerified ||
		( ! isFreePlan && isMonthlyPlan )
	) {
		return null;
	}

	return (
		<CalypsoShoppingCartProvider>
			<RenderDomainUpsell isFreePlan={ isFreePlan } isMonthlyPlan={ isMonthlyPlan } />
		</CalypsoShoppingCartProvider>
	);
}

export function RenderDomainUpsell( { isFreePlan, isMonthlyPlan } ) {
	const translate = useTranslate();
	const siteSlug = useSelector( ( state ) => getSelectedSiteSlug( state ) );
	const siteSubDomain = siteSlug.split( '.' )[ 0 ];
	const locale = useLocale();
	const { allDomainSuggestions } =
		useDomainSuggestions( siteSubDomain, 3, undefined, locale, {
			vendor: 'domain-upsell',
		} ) || {};

	const cartKey = useCartKey();
	const shoppingCartManager = useShoppingCart( cartKey );

	// Get first non-free suggested domain.
	const domainSuggestion = allDomainSuggestions?.filter(
		( suggestion ) => ! suggestion.is_free
	)[ 0 ];

	// It takes awhile to suggest a domain name. Set a default to siteSubDomain.com.
	const domainSuggestionName = domainSuggestion?.domain_name ?? siteSubDomain + '.com';
	const domainSuggestionProductSlug = domainSuggestion?.product_slug;

	const searchLink = addQueryArgs(
		{
			domainAndPlanPackage: true,
			domain: true,
		},
		`/domains/add/${ siteSlug }`
	);
	const getSearchClickHandler = () => {
		recordTracksEvent( 'calypso_my_home_domain_upsell_search_click', {
			button_url: searchLink,
			domain_suggestion: domainSuggestionName,
			product_slug: domainSuggestionProductSlug,
		} );
	};

	const purchaseLink =
		! isFreePlan && ! isMonthlyPlan
			? `/checkout/${ siteSlug }`
			: addQueryArgs(
					{
						domain: true,
						domainAndPlanPackage: true,
					},
					`/plans/yearly/${ siteSlug }`
			  );
	const [ ctaIsBusy, setCtaIsBusy ] = useState( false );
	const getCtaClickHandler = async () => {
		setCtaIsBusy( true );
		recordTracksEvent( 'calypso_my_home_domain_upsell_cta_click', {
			button_url: purchaseLink,
			domain_suggestion: domainSuggestionName,
			product_slug: domainSuggestionProductSlug,
		} );

		try {
			await shoppingCartManager.addProductsToCart( [
				domainRegistration( {
					productSlug: domainSuggestionProductSlug,
					domain: domainSuggestionName,
				} ),
			] );
		} catch {
			// Nothing needs to be done here. CartMessages will display the error to the user.
			return null;
		}
		page( purchaseLink );
	};

	const cardTitle =
		! isFreePlan && ! isMonthlyPlan
			? translate( 'You still have a free domain to claim!' )
			: translate( 'Own your online identity with a custom domain' );

	const cardSubtitle =
		! isFreePlan && ! isMonthlyPlan
			? translate(
					'Own your online identity giving your site a memorable domain name. Your plan includes one for free for one year, so you can still claim it.'
			  )
			: translate(
					"Stake your claim on your corner of the web with a site address that's easy to find, share, and follow."
			  );

	return (
		<Card className="domain-upsell__card customer-home__card">
			<TrackComponentView eventName="calypso_my_home_domain_upsell_impression" />
			<div>
				<h3>{ cardTitle }</h3>
				<p>{ cardSubtitle }</p>
				<div className="suggested-domain-name">
					<div className="card">
						<span>
							<strike>{ siteSlug }</strike>
						</span>
						<div className="badge badge--info">{ translate( 'Current' ) }</div>
					</div>
					<div className="card">
						<span>{ domainSuggestionName }</span>
						{ domainSuggestion?.domain_name ? (
							<div className="badge badge--success">{ translate( 'Available' ) }</div>
						) : (
							<div className="badge">
								<Spinner />
							</div>
						) }
					</div>
				</div>

				<div className="domain-upsell-actions">
					<Button href={ searchLink } onClick={ getSearchClickHandler }>
						{ translate( 'Search for a domain' ) }
					</Button>
					<Button primary onClick={ getCtaClickHandler } busy={ ctaIsBusy }>
						{ translate( 'Buy this domain' ) }
					</Button>
				</div>
			</div>
		</Card>
	);
}
