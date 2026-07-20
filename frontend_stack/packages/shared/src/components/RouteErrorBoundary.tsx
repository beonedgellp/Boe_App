import { ErrorBoundary } from './ErrorBoundary.tsx';

export function RouteErrorBoundary({ children }) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

export default RouteErrorBoundary;
