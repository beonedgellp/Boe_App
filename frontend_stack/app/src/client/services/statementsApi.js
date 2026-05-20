import { fixtureStatements } from '../data/fixtureStatements.js';
import { apiRequest, clone, delay, listFromPayload, useHttpApi } from './_util.js';

export async function listStatements() {
  if (useHttpApi()) return listFromPayload(await apiRequest('/v1/client/statements'));

  await delay();
  return clone(fixtureStatements);
}


