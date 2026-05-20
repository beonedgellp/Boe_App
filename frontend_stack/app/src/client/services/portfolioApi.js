import { fixturePortfolio } from '../data/fixturePortfolio.js';
import { apiRequest, clone, delay, useHttpApi } from './_util.js';

export async function getPortfolio() {
  if (useHttpApi()) return apiRequest('/v1/client/portfolio');

  await delay();
  return clone(fixturePortfolio);
}


