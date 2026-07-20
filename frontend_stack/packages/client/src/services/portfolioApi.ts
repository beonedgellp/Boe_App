import { fixturePortfolio } from '../data/fixturePortfolio';
import { apiRequest, clone, delay, useHttpApi } from './_util';

export async function getPortfolio() {
  if (useHttpApi()) return apiRequest('/v1/client/portfolio');

  await delay();
  return clone(fixturePortfolio);
}


