import { Link } from 'react-router-dom';
import { stageLabel } from '../../services/claimRules';
import { formatCurrency, formatDateShort } from '../../utils/format';
import AssetTypeBadge from '../ui/AssetTypeBadge';
import Icon from '../ui/Icon';
import StatusBadge from '../ui/StatusBadge';

/** Dashboard section: claim counts for the active case and its latest claims. */
export default function ClaimsOverview({ claims }) {
  const { summary, recent } = claims;

  const figures = [
    { label: 'Total claims', value: summary.total },
    { label: 'Pending claims', value: summary.pending },
    { label: 'Documents required', value: summary.documentsRequired },
    { label: 'In verification', value: summary.inVerification },
    { label: 'Approved', value: summary.approved },
    { label: 'Settlement completed', value: summary.settled },
  ];

  return (
    <section className="panel claims-overview" aria-label="Claims overview">
      <header className="panel__header">
        <div>
          <h3>Claims overview</h3>
          <p>
            {summary.total === 0
              ? 'Every bank and insurance claim for this case'
              : `Total claim value ${formatCurrency(summary.totalAmount)} across ${summary.total} ${summary.total === 1 ? 'claim' : 'claims'}`}
          </p>
        </div>
        <Link className="btn btn--secondary btn--sm" to="/claims">
          View All Claims <Icon name="arrow" size={14} />
        </Link>
      </header>

      <dl className="mini-stats">
        {figures.map((figure) => (
          <div key={figure.label}>
            <dt>{figure.label}</dt>
            <dd>{figure.value}</dd>
          </div>
        ))}
      </dl>

      {recent.length === 0 ? (
        <p className="panel__empty">
          No claims yet. Claims appear here once financial assets are added to this case.
        </p>
      ) : (
        <>
          <h4 className="claims-overview__subtitle">Most recent claims</h4>
          <div className="table-wrap">
            <table className="table table--overview">
              <thead>
                <tr>
                  <th scope="col">Claim</th>
                  <th scope="col">Type</th>
                  <th scope="col" className="num">
                    Amount
                  </th>
                  <th scope="col">Status</th>
                  <th scope="col">Current stage</th>
                  <th scope="col">Last updated</th>
                </tr>
              </thead>
              <tbody>
                {recent.map((claim) => (
                  <tr key={claim.id}>
                    <td data-label="Claim">
                      <p className="table__primary">
                        <Link className="table__link" to={`/claims/${claim.id}`}>
                          {claim.claimReference}
                        </Link>
                      </p>
                      <p className="table__secondary">
                        {claim.institutionName}
                        {claim.asset ? ` · ${claim.asset.product}` : ''}
                      </p>
                    </td>
                    <td data-label="Type">
                      <AssetTypeBadge type={claim.assetType} />
                    </td>
                    <td data-label="Amount" className="num">
                      {formatCurrency(claim.claimAmount)}
                    </td>
                    <td data-label="Status">
                      <StatusBadge status={claim.claimStatus} />
                    </td>
                    <td data-label="Current stage">{stageLabel(claim)}</td>
                    <td data-label="Last updated" className="nowrap">
                      {formatDateShort(claim.lastUpdated)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
