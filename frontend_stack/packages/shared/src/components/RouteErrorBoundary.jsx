import { ErrorBoundary } from './ErrorBoundary.jsx';

export function RouteErrorBoundary({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

export default RouteErrorBoundary;
