import { Navigate, useSearchParams } from 'react-router-dom';
import { resolveLegacyLocation } from '../navigation/legacyTabMap.ts';

export default function LegacyTabRedirect() {
  const [searchParams] = useSearchParams();
  return <Navigate to={resolveLegacyLocation(searchParams)} replace />;
}
