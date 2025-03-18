const axios = require('axios');
const axiosRetry = require('axios-retry');

const webflowClient = axios.create({
  baseURL: 'https://api.webflow.com',
  headers: {
    'Authorization': `Bearer ${process.env.WEBFLOW_API_TOKEN}`,
    'Accept-Version': '1.0.0'
  }
});

// Add retry logic for API rate limits
axiosRetry(webflowClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => {
    return axiosRetry.isNetworkOrIdempotentRequestError(error) || 
           error.response?.status === 429; // Rate limit error
  }
});

async function getSites() {
  const response = await webflowClient.get('/sites');
  return response.data;
}

async function getSite(siteId) {
  const response = await webflowClient.get(`/sites/${siteId}`);
  return response.data;
}

async function getCollections(siteId) {
  const response = await webflowClient.get(`/sites/${siteId}/collections`);
  return response.data;
}

async function getCollectionItems(collectionId) {
  const response = await webflowClient.get(`/collections/${collectionId}/items`);
  return response.data;
}

async function createCmsItem(collectionId, fields) {
  const response = await webflowClient.post(`/collections/${collectionId}/items`, {
    fields: fields
  });
  return response.data;
}

async function updateCmsItem(collectionId, itemId, fields) {
  const response = await webflowClient.put(`/collections/${collectionId}/items/${itemId}`, {
    fields: fields
  });
  return response.data;
}

async function getSitePages(siteId) {
  const response = await webflowClient.get(`/sites/${siteId}/pages`);
  return response.data;
}

async function getPageDetails(pageId) {
  const response = await webflowClient.get(`/pages/${pageId}`);
  return response.data;
}

async function updatePageContent(pageId, updates) {
  const response = await webflowClient.patch(`/pages/${pageId}`, updates);
  return response.data;
}

async function publishSite(siteId, domains = []) {
  const response = await webflowClient.post(`/sites/${siteId}/publish`, {
    domains: domains
  });
  return response.data;
}

module.exports = {
  getSites,
  getSite,
  getCollections,
  getCollectionItems,
  createCmsItem,
  updateCmsItem,
  getSitePages,
  getPageDetails,
  updatePageContent,
  publishSite
};
