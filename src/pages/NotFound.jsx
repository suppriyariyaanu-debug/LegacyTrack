import { Link } from 'react-router-dom';
import Icon from '../components/ui/Icon';

export default function NotFound() {
  return (
    <section className="empty-state">
      <div className="empty-state__icon">
        <Icon name="search" size={26} />
      </div>
      <h2>Page not found</h2>
      <p>The page you are looking for does not exist or has been moved.</p>
      <Link className="btn btn--primary" to="/dashboard">
        Go to Dashboard
      </Link>
    </section>
  );
}
