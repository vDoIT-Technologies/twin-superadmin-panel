import api from './httpClient';

function getFilename(contentDisposition, fallbackFilename) {
  const encodedMatch = contentDisposition?.match(/filename\*=UTF-8''([^;]+)/i);
  if (encodedMatch) {
    return decodeURIComponent(encodedMatch[1].replace(/["']/g, ''));
  }

  const filenameMatch = contentDisposition?.match(/filename=["']?([^;"']+)/i);
  return filenameMatch?.[1]?.trim() || fallbackFilename;
}

async function downloadCsv(path, filename, params = {}) {
  const response = await api.get(path, {
    params: Object.fromEntries(
      Object.entries(params).filter(([, value]) => value != null && value !== ''),
    ),
    responseType: 'blob',
  });
  const blob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = getFilename(response.headers['content-disposition'], filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

export const exportService = {
  clients: (params) => downloadCsv('/api/v1/export/clients', 'clients.csv', params),
  twins: (params) => downloadCsv('/api/v1/export/twins', 'twins.csv', params),
  users: (params) => downloadCsv('/api/v1/export/users', 'users.csv', params),
};
