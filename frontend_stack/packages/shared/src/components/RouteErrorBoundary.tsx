import { ErrorBoundary } from './ErrorBoundary';

export function RouteErrorBoundary({ children }: any) {
  return (
    <ErrorBoundary>
      {children}
    </ErrorBoundary>
  );
}

export default RouteErrorBoundary;
