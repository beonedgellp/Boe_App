import { apiRequest, clone, delay, listFromPayload, useHttpApi } from './_util';
import { loadAppConfig } from '@beonedge/shared/appConfig';

export async function getResearchContext() {
  if (useHttpApi()) {
    try {
      return listFromPayload(await apiRequest('/v1/client/research-context'));
    } catch (error) {
      if ((error as any)?.code !== 'USER_NOT_APPROVED') throw error;
      return clone(loadAppConfig().mobile.researchContext);
    }
  }

  await delay();
  return clone(loadAppConfig().mobile.researchContext);
}
