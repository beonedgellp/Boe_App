import { fixtureStatements } from '../data/fixtureStatements';
import { apiRequest, clone, delay, listFromPayload, useHttpApi } from './_util';

export async function listStatements() {
  if (useHttpApi()) return listFromPayload(await apiRequest('/v1/client/statements'));

  await delay();
  return clone(fixtureStatements);
}


