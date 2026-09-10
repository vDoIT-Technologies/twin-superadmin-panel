import api from './httpClient';

const PACKAGES_PATH = '/api/v1/packages';

export const packageService = {
  async getPackages(type) {
    const response = await api.get(PACKAGES_PATH, { params: { type } });
    return response.data;
  },

  async createPackage(payload) {
    const response = await api.post(PACKAGES_PATH, payload);
    return response.data;
  },

  async updatePackage(packageId, payload) {
    const response = await api.put(`${PACKAGES_PATH}/${encodeURIComponent(packageId)}`, payload);
    return response.data;
  },

  async deletePackage(packageId) {
    const response = await api.delete(`${PACKAGES_PATH}/${encodeURIComponent(packageId)}`);
    return response.data;
  },
};
