import { fixtureStatements } from '../data/fixtureStatements.ts';
import { apiRequest, clone, delay, listFromPayload, useHttpApi } from './_util.ts';

export async function listStatements() {
  if (useHttpApi()) return listFromPayload(await apiRequest('/v1/client/statements'));

  await delay();
  return clone(fixtureStatements);
}


