import { Routes } from '#shared/routes/constants.js';
import { emptyCollection, placeholder } from '#shared/services/placeholderService.js';
import { getPublishedAppConfig } from '#shared/services/appConfigService.js';
import { getPublishedLandingConfig } from '#shared/services/landingConfigService.js';
import { listFunds, toClientFunds } from '#shared/services/fundCatalogService.js';
import { listCourses } from '#shared/services/courseService.js';
import { listPlans } from '#shared/services/planService.js';
import { getDisclosures, getInvestorCharter, getGrievanceContent } from '../services/disclosureService.js';
import { submitApplication, submitRiskProfile, submitKycDocuments } from '../services/onboardingService.js';
import { validateBody } from '#http/validate.js';

export function registerPublicRoutes(router) {
  router.post(Routes.POST_V1_ONBOARDING_APPLICATIONS, {
    group: 'public',
    auth: false,
    description: 'Submit a website onboarding application.',
  }, async ({ config, body }) => {
    validateBody(body, {
      name: { required: true, type: 'string', minLength: 1 },
      email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      phone: { required: true, type: 'string', minLength: 1 },
    });
    return submitApplication(config, body);
  });

  router.post(Routes.POST_V1_ONBOARDING_RISK_PROFILE, {
    group: 'public',
    auth: false,
    description: 'Submit onboarding risk profile answers.',
  }, async ({ config, body }) => {
    validateBody(body, {
      email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      answers: { required: true, type: 'object' },
      onboardingSessionId: { required: true, type: 'string', minLength: 1 },
    });
    return submitRiskProfile(config, body);
  });

  router.post(Routes.POST_V1_ONBOARDING_KYC_DOCUMENTS, {
    group: 'public',
    auth: false,
    description: 'Register KYC document references for review.',
  }, async ({ config, body }) => {
    validateBody(body, {
      email: { required: true, type: 'string', pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
      documentType: { required: true, type: 'string', minLength: 1 },
      documentRef: { required: true, type: 'string', minLength: 1 },
      onboardingSessionId: { required: true, type: 'string', minLength: 1 },
    });
    return submitKycDocuments(config, body);
  });

  router.get(Routes.GET_V1_PUBLIC_PRODUCTS, {
    group: 'public',
    auth: false,
    description: 'Public strategy catalogue.',
  }, async ({ config }) => {
    const { items } = await listFunds(config);
    const clientItems = toClientFunds(items)
      .filter((f) => f.lifecycleStage === 'active' || f.lifecycleStage === 'published');
    return { items: clientItems, count: clientItems.length };
  });

  router.get(Routes.GET_V1_APP_CONFIG, {
    group: 'public',
    auth: false,
    description: 'Published mobile app component and content configuration.',
  }, ({ config }) => getPublishedAppConfig(config));

  router.get(Routes.GET_V1_PUBLIC_LANDING_CONFIG, {
    group: 'public',
    auth: false,
    description: 'Published landing page content configuration.',
  }, ({ config }) => getPublishedLandingConfig(config));

  router.get(Routes.GET_V1_PUBLIC_DISCLOSURES, {
    group: 'public',
    auth: false,
    description: 'Published strategy disclosures.',
  }, ({ config }) => getDisclosures(config));

  router.get(Routes.GET_V1_PUBLIC_INVESTOR_CHARTER, {
    group: 'public',
    auth: false,
    description: 'SEBI-mandated investor charter.',
  }, ({ config }) => getInvestorCharter(config));

  router.get(Routes.GET_V1_PUBLIC_GRIEVANCE, {
    group: 'public',
    auth: false,
    description: 'Grievance redressal process and escalation matrix.',
  }, ({ config }) => getGrievanceContent(config));

  router.get(Routes.GET_V1_PUBLIC_COURSES, {
    group: 'public',
    auth: false,
    description: 'Published courses.',
  }, async ({ config }) => listCourses(config));

  router.get(Routes.GET_V1_PUBLIC_PLANS, {
    group: 'public',
    auth: false,
    description: 'Published plans.',
  }, async ({ config }) => listPlans(config));
}
