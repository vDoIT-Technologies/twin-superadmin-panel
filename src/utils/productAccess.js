const PRODUCT_ACCESS = {
  twin: {
    label: 'Twin Protocol',
    paths: ['/', '/profile', '/clients', '/twins', '/users', '/services', '/usage'],
  },
  vault: {
    label: 'Vault',
    paths: ['/', '/profile', '/clients', '/users', '/services', '/vault', '/plans', '/usage'],
  },
};

export function getAdminProduct(role) {
  const value = typeof role === 'string' ? role : role?.name ?? role?.label ?? '';
  const normalized = value.trim().toLowerCase().replace(/[\s_-]+/g, '');

  if (normalized.includes('vault')) return 'vault';
  if (normalized.includes('twin') || normalized.includes('platform')) return 'twin';

  return 'twin';
}

export function getProductLabel(product) {
  return PRODUCT_ACCESS[product]?.label ?? PRODUCT_ACCESS.twin.label;
}

export function canAccessPath(product, pathname) {
  const allowedPaths = PRODUCT_ACCESS[product]?.paths ?? PRODUCT_ACCESS.twin.paths;
  return allowedPaths.some((path) => path === '/' ? pathname === '/' : pathname === path || pathname.startsWith(`${path}/`));
}

export function isServiceForProduct(product, serviceId) {
  return product === 'vault' ? serviceId === 'vault' : serviceId !== 'vault';
}

export function isVendorForProduct(product, vendorId) {
  return product === 'vault' ? vendorId === 'filebase' : vendorId !== 'filebase';
}