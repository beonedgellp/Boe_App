import { useEffect, useState } from 'react';
import { loadAppConfig, loadRemoteAppConfig, subscribeToAppConfig } from '@beonedge/shared/appConfig.js';

export function useAppConfig() {
  const [config, setConfig] = useState(() => loadAppConfig());

  useEffect(() => {
    let cancelled = false;
    loadRemoteAppConfig().then((remoteConfig) => {
      if (!cancelled && remoteConfig) setConfig(remoteConfig);
    }).catch(() => {});

    const unsubscribe = subscribeToAppConfig(setConfig);
    return () => {
      cancelled = true;
      unsubscribe();
    };
  }, []);

  return config;
}
