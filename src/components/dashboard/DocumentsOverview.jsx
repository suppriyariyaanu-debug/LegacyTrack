import { Link } from 'react-router-dom';
import Icon from '../ui/Icon';
import StatusBadge from '../ui/StatusBadge';

const SHOWN = 5;

/** Dashboard section: document counts for the active case and what still needs attention. */
export default function DocumentsOverview({ summary, outstanding }) {
  const figures = [
    { label: 'Total documents', value: summary.total },
    { label: 'Uploaded', value: summary.uploaded },
    { label: 'Required', value: summary.required },
    { label: 'Verified', value: summary.verified },
  ];

  return (
    <section className="panel" aria-label="Documents overview">
      <header className="panel__header">
        <div>
          <h3>Documents overview</h3>
          <p>Across this case and its claims</p>
        </div>
        <Link className="btn btn--secondary btn--sm" to="/documents">
          View All Documents <Icon name="arrow" size={14} />
        </Link>
      </header>

      <dl className="mini-stats mini-stats--compact">
        {figures.map((figure) => (
          <div key={figure.label}>
            <dt>{figure.label}</dt>
            <dd>{figure.value}</dd>
          </div>
        ))}
      </dl>

      <h4 className="claims-overview__subtitle">Documents requiring attention</h4>
      {outstanding.length === 0 ? (
        <p className="panel__empty">Nothing outstanding. All documents are in place.</p>
      ) : (
        <ul className="doc-list">
          {outstanding.slice(0, SHOWN).map((doc) => (
            <li key={doc.id}>
              <div>
                <p className="doc-list__name">
                  <Link className="table__link" to={`/documents/${doc.id}`}>
                    {doc.name}
                  </Link>
                </p>
                <p className="doc-list__for">
                  {doc.neededFor ? `For ${doc.neededFor}` : 'Case document'}
                </p>
              </div>
              <StatusBadge status={doc.status} />
            </li>
          ))}
          {outstanding.length > SHOWN && (
            <li className="doc-list__more">and {outstanding.length - SHOWN} more</li>
          )}
        </ul>
      )}
    </section>
  );
}
