import api from './httpClient';

const unwrap = (response) => {
  const body = response?.data;
  if (body && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data;
  }
  return body;
};

const getDeleteHeaders = () => {
  const token = sessionStorage.getItem('superadmin_delete_token');
  return token ? { 'x-delete-token': token } : {};
};

const normalizeList = (data, { page, limit, search, env, tab }) => {
  if (!Array.isArray(data)) return data;

  let list = data;

  if (search) {
    const q = search.toLowerCase();
    list = list.filter(
      (v) => v.name?.toLowerCase().includes(q) || v.voice_id?.toLowerCase().includes(q),
    );
  }
  if (tab === 'unused') list = list.filter((v) => !v.is_used);
  else if (['prod', 'staging', 'dev'].includes(tab)) {
    list = list.filter((v) => v.environments?.includes(tab));
  }
  if (env) list = list.filter((v) => v.environments?.includes(env));

  const total = list.length;
  const start = (page - 1) * limit;

  return {
    voices: list.slice(start, start + limit),
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.max(1, Math.ceil(total / limit)),
    },
  };
};

export const voiceService = {
  async list(refresh = false, params = {}) {
    const page = params.page || 1;
    const limit = params.limit || 10;
    const { search, env, tab } = params;

    const res = await api.get('/api/v1/voices', {
      params: {
        ...(refresh ? { refresh: 'true' } : {}),
        page,
        limit,
        ...(search ? { search } : {}),
        ...(env ? { env } : {}),
        ...(tab && tab !== 'all' ? { tab } : {}),
      },
    });

    return normalizeList(unwrap(res), { page, limit, search, env, tab });
  },

  async syncHistory() {
    const res = await api.post('/api/v1/voices/sync-history');
    return unwrap(res);
  },

  async verifyPassword(password) {
    const res = await api.post('/api/v1/auth/verify-password', { password });
    const data = unwrap(res);
    if (data?.deleteToken) {
      sessionStorage.setItem('superadmin_delete_token', data.deleteToken);
    }
    return data;
  },

  async deleteOne(voiceId, confirmProd = false) {
    const res = await api.delete(`/api/v1/voices/${encodeURIComponent(voiceId)}`, {
      params: confirmProd ? { confirmProd: 'true' } : {},
      headers: getDeleteHeaders(),
    });
    return unwrap(res);
  },

  async deleteBulk(voiceIds, confirmProd = false) {
    const res = await api.post('/api/v1/voices/bulk-delete', 
      { voiceIds, confirmProd },
      { headers: getDeleteHeaders() }
    );
    return unwrap(res);
  },

  async listDeletions({ page = 1, limit = 20, prodOnly = false } = {}) {
    const res = await api.get('/api/v1/audit/deletions', {
      params: { page, limit, ...(prodOnly ? { prodOnly: 'true' } : {}) },
    });
    return unwrap(res);
  },
};