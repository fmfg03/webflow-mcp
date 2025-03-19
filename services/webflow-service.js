const axios = require('axios');
// Try different import formats for axios-retry
let axiosRetry;
try {
  // First attempt: standard import
  axiosRetry = require('axios-retry');
  // Check if it's a default export
  if (typeof axiosRetry !== 'function' && axiosRetry.default) {
    axiosRetry = axiosRetry.default;
  }
} catch (error) {
  console.error('Error importing axios-retry:', error);
  // Fallback: implement a simple retry mechanism
  axiosRetry = function(client, options) {
    // Simple implementation that attaches interceptors
    client.interceptors.response.use(null, async (error) => {
      const { config } = error;
      if (!config || !config.retry) {
        config.retry = 0;
      }
      
      if (config.retry >= (options.retries || 3)) {
        return Promise.reject(error);
      }
      
      config.retry += 1;
      const delay = options.retryDelay ? options.retryDelay(config.retry) : 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      return client(config);
    });
  };
  
  // Add missing functions
  axiosRetry.exponentialDelay = (retryNumber) => {
    return Math.pow(2, retryNumber) * 1000;
  };
  
  axiosRetry.isNetworkOrIdempotentRequestError = (error) => {
    return !error.response || (error.response.status >= 500 && error.response.status <= 599);
  };
}

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
