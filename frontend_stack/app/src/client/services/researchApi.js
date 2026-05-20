import { apiRequest, clone, delay, listFromPayload, useHttpApi } from './_util.js';
import { loadAppConfig } from '../../shared/appConfig.js';

export async function getResearchContext() {
  if (useHttpApi()) {
    try {
      return listFromPayload(await apiRequest('/v1/client/research-context'));
    } catch (error) {
      if (error?.code !== 'USER_NOT_APPROVED') throw error;
      return clone(loadAppConfig().mobile.researchContext);
    }
  }

  await delay();
  return clone(loadAppConfig().mobile.researchContext);
}
