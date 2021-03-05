/**
 * External dependencies
 */
import page from 'page';
import { localize } from 'i18n-calypso';
import PropTypes from 'prop-types';
import React from 'react';
import { map, find } from 'lodash';

/**
 * Internal Dependencies
 */
import { recordTracksEvent } from 'calypso/lib/analytics/tracks';
import cancellationReasons from './cancellation-reasons';
import { cancelAndRefundPurchase } from 'calypso/lib/purchases/actions';
import { Card } from '@automattic/components';
import { clearPurchases } from 'calypso/state/purchases/actions';
import ConfirmCancelDomainLoadingPlaceholder from './loading-placeholder';
import { connect } from 'react-redux';
import FormButton from 'calypso/components/forms/form-button';
import FormCheckbox from 'calypso/components/forms/form-checkbox';
import FormLabel from 'calypso/components/forms/form-label';
import FormSectionHeading from 'calypso/components/forms/form-section-heading';
import FormTextarea from 'calypso/components/forms/form-textarea';
import HeaderCake from 'calypso/components/header-cake';
import isDomainOnly from 'calypso/state/selectors/is-domain-only-site';
import {
	getByPurchaseId,
	hasLoadedUserPurchasesFromServer,
} from 'calypso/state/purchases/selectors';
import { getName as getDomainName } from 'calypso/lib/purchases';
import { isDataLoading } from '../utils';
import { getSelectedSite } from 'calypso/state/ui/selectors';
import { isDomainRegistration } from 'calypso/lib/products-values';
import { isRequestingSites } from 'calypso/state/sites/selectors';
import { cancelPurchase, purchasesRoot } from 'calypso/me/purchases/paths';
import QueryUserPurchases from 'calypso/components/data/query-user-purchases';
import { receiveDeletedSite } from 'calypso/state/sites/actions';
import { refreshSitePlans } from 'calypso/state/sites/plans/actions';
import { setAllSitesSelected } from 'calypso/state/ui/actions';
import titles from 'calypso/me/purchases/titles';
import PageViewTracker from 'calypso/lib/analytics/page-view-tracker';
import TrackPurchasePageView from 'calypso/me/purchases/track-purchase-page-view';
import { getCurrentUserId } from 'calypso/state/current-user/selectors';
import { errorNotice, successNotice } from 'calypso/state/notices/actions';

/**
 * Style dependencies
 */
import './style.scss';
import FormSelect from 'calypso/components/forms/form-select';

class ConfirmCancelDomain extends React.Component {
	static propTypes = {
		purchaseListUrl: PropTypes.string,
		getCancelPurchaseUrlFor: PropTypes.func,
		hasLoadedUserPurchasesFromServer: PropTypes.bool.isRequired,
		isDomainOnlySite: PropTypes.bool,
		purchaseId: PropTypes.number.isRequired,
		receiveDeletedSite: PropTypes.func.isRequired,
		purchase: PropTypes.object,
		selectedSite: PropTypes.oneOfType( [ PropTypes.bool, PropTypes.object ] ),
		setAllSitesSelected: PropTypes.func.isRequired,
		siteSlug: PropTypes.string.isRequired,
		userId: PropTypes.number,
	};

	state = {
		selectedReason: null,
		message: '',
		confirmed: false,
		submitting: false,
	};

	static defaultProps = {
		purchaseListUrl: purchasesRoot,
		getCancelPurchaseUrlFor: cancelPurchase,
	};

	componentDidMount() {
		this.redirectIfDataIsInvalid( this.props );
	}

	UNSAFE_componentWillReceiveProps( nextProps ) {
		this.redirectIfDataIsInvalid( nextProps );
	}

	redirectIfDataIsInvalid = ( props ) => {
		if ( isDataLoading( props ) || this.state.submitting ) {
			return null;
		}

		const { purchase } = props;

		if ( ! purchase || ! isDomainRegistration( purchase ) || ! props.selectedSite ) {
			page.redirect( this.props.purchaseListUrl );
		}
	};

	isValidReasonToCancel = () => {
		const selectedReason = this.state.selectedReason;

		if ( ! selectedReason ) {
			return false;
		}

		return [ 'other_host', 'transfer' ].indexOf( selectedReason.value ) === -1;
	};

	onSubmit = ( event ) => {
		event.preventDefault();

		const { purchase } = this.props;
		const purchaseName = getDomainName( purchase );

		const data = {
			domain_cancel_reason: this.state.selectedReason.value,
			domain_cancel_message: this.state.message,
			confirm: true,
			product_id: purchase.productId,
			blog_id: purchase.siteId,
			domain: purchaseName,
		};

		this.setState( { submitting: true } );

		cancelAndRefundPurchase( purchase.id, data, ( error ) => {
			this.setState( { submitting: false } );

			const { isDomainOnlySite, translate, selectedSite } = this.props;

			if ( isDomainOnlySite ) {
				this.props.receiveDeletedSite( selectedSite.ID );
				this.props.setAllSitesSelected();
			}

			if ( error ) {
				this.props.errorNotice(
					error.message ||
						translate(
							'Unable to cancel your purchase. Please try again later or contact support.'
						)
				);

				return;
			}

			this.props.successNotice(
				translate( '%(purchaseName)s was successfully cancelled and refunded.', {
					args: { purchaseName },
				} ),
				{ displayOnNextPage: true }
			);

			this.props.refreshSitePlans( purchase.siteId );

			this.props.clearPurchases();

			recordTracksEvent( 'calypso_domain_cancel_form_submit', {
				product_slug: purchase.productSlug,
			} );

			page.redirect( this.props.purchaseListUrl );
		} );
	};

	onReasonChange = ( event ) => {
		const select = event.currentTarget;
		this.setState( {
			selectedReason: find( cancellationReasons, { value: select[ select.selectedIndex ].value } ),
		} );
	};

	onConfirmationChange = () => {
		this.setState( { confirmed: ! this.state.confirmed } );
	};

	onMessageChange = ( event ) => {
		this.setState( {
			message: event.target.value,
		} );
	};

	renderHelpMessage = () => {
		const selectedReason = this.state.selectedReason;

		if ( ! selectedReason ) {
			return;
		}

		return (
			<div className="confirm-cancel-domain__help-message">
				<p>{ selectedReason.helpMessage }</p>
				{ selectedReason.showTextarea && (
					<FormTextarea
						className="confirm-cancel-domain__reason-details"
						onChange={ this.onMessageChange }
					/>
				) }
			</div>
		);
	};

	renderConfirmationCheckbox = () => {
		if ( ! this.isValidReasonToCancel() ) {
			return;
		}

		return (
			<div className="confirm-cancel-domain__confirm-container">
				<FormLabel>
					<FormCheckbox checked={ this.state.confirmed } onChange={ this.onConfirmationChange } />
					<span>
						{ this.props.translate(
							'I understand that canceling means that I may {{strong}}lose this domain forever{{/strong}}.',
							{
								components: {
									strong: <strong />,
								},
							}
						) }
					</span>
				</FormLabel>
			</div>
		);
	};

	renderSubmitButton = () => {
		if ( ! this.isValidReasonToCancel() ) {
			return;
		}

		if ( this.state.submitting ) {
			return (
				<FormButton isPrimary={ true } disabled={ true }>
					{ this.props.translate( 'Cancelling Domain…' ) }
				</FormButton>
			);
		}

		const selectedReason = this.state.selectedReason;
		const confirmed = this.state.confirmed;

		if ( selectedReason && 'misspelled' === selectedReason.value ) {
			return (
				<FormButton isPrimary={ true } onClick={ this.onSubmit } disabled={ ! confirmed }>
					{ this.props.translate( 'Cancel Anyway' ) }
				</FormButton>
			);
		}

		return (
			<FormButton isPrimary={ true } onClick={ this.onSubmit } disabled={ ! confirmed }>
				{ this.props.translate( 'Cancel Domain' ) }
			</FormButton>
		);
	};

	render() {
		if ( isDataLoading( this.props ) ) {
			return (
				<div>
					<QueryUserPurchases userId={ this.props.userId } />
					<ConfirmCancelDomainLoadingPlaceholder
						purchaseId={ this.props.purchaseId }
						selectedSite={ this.props.selectedSite }
					/>
				</div>
			);
		}

		const { purchase } = this.props;
		const domain = getDomainName( purchase );

		return (
			<React.Fragment>
				<TrackPurchasePageView
					eventName="calypso_confirm_cancel_domain_purchase_view"
					purchaseId={ this.props.purchaseId }
				/>
				<PageViewTracker
					path="/me/purchases/:site/:purchaseId/confirm-cancel-domain"
					title="Purchases > Confirm Cancel Domain"
				/>
				<HeaderCake
					backHref={ this.props.getCancelPurchaseUrlFor(
						this.props.siteSlug,
						this.props.purchaseId
					) }
				>
					{ titles.confirmCancelDomain }
				</HeaderCake>
				<Card>
					<FormSectionHeading>
						{ this.props.translate( 'Canceling %(domain)s', { args: { domain } } ) }
					</FormSectionHeading>
					<p>
						{ this.props.translate(
							'Since domain cancellation can cause your site to stop working, ' +
								'we’d like to make sure we help you take the right action. ' +
								'Please select the best option below.'
						) }
					</p>
					<FormSelect
						className="confirm-cancel-domain__reasons-dropdown"
						onChange={ this.onReasonChange }
						defaultValue="disabled"
					>
						<option disabled="disabled" value="disabled" key="disabled">
							{ this.props.translate( 'Please let us know why you wish to cancel.' ) }
						</option>
						{ map( cancellationReasons, ( { value, label } ) => (
							<option value={ value } key={ value }>
								{ label }
							</option>
						) ) }
					</FormSelect>
					{ this.renderHelpMessage() }
					{ this.renderConfirmationCheckbox() }
					{ this.renderSubmitButton() }
				</Card>
			</React.Fragment>
		);
	}
}

export default connect(
	( state, props ) => {
		const selectedSite = getSelectedSite( state );

		return {
			hasLoadedSites: ! isRequestingSites( state ),
			hasLoadedUserPurchasesFromServer: hasLoadedUserPurchasesFromServer( state ),
			isDomainOnlySite: isDomainOnly( state, selectedSite && selectedSite.ID ),
			purchase: getByPurchaseId( state, props.purchaseId ),
			selectedSite,
			userId: getCurrentUserId( state ),
		};
	},
	{
		clearPurchases,
		errorNotice,
		refreshSitePlans,
		receiveDeletedSite,
		setAllSitesSelected,
		successNotice,
	}
)( localize( ConfirmCancelDomain ) );
