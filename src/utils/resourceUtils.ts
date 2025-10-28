import type { PerformanceEntry, PerformanceData, ResourceExtras } from '../types/performance';

export function getResourceExtras(name: string, siteModels?: PerformanceData['siteModels']): ResourceExtras {
  const extras: ResourceExtras = {};
  try {
    // Check if it's an API first (before file check)
    const base = siteModels?.publicModel?.externalBaseUrl;
    if (base) {
      const variants: string[] = [];
      const withSlash = base.endsWith('/') ? base : base + '/';
      const withoutSlash = base.endsWith('/') ? base.slice(0, -1) : base;
      variants.push(withSlash + '_api/', withoutSlash + '/_api/');
      try {
        const bu = new URL(base);
        variants.push(bu.origin + '/_api/');
      } catch {}

      for (const pref of variants) {
        if (name.startsWith(pref)) {
          extras.resource_subtype = 'API';
          // Extract api name (first segment after _api/)
          try {
            const u = new URL(name);
            const path = u.pathname; // begins with /
            const idx = path.indexOf('/_api/');
            if (idx >= 0) {
              const rest = path.substring(idx + 6); // after '/_api/'
              const seg = rest.split('/')[0];
              if (seg) extras.api_name = seg;
            }
          } catch {
            // Fallback for non-absolute
            const idx2 = name.indexOf('/_api/');
            if (idx2 >= 0) {
              const rest = name.substring(idx2 + 6);
              const seg = rest.split('/')[0];
              if (seg) extras.api_name = seg;
            }
          }
          return extras;
        }
      }
    }

    // Check if it's a File by file extension
    const fileExtensionPattern = /\.(js|css|woff2?|ttf|otf|eot|svg|png|jpg|jpeg|gif|webp|ico|json|map|txt|xml|html|htm|pdf|zip|gz|wasm)(\?.*)?$/i;
    const hasFileExtension = fileExtensionPattern.test(name);
    
    if (hasFileExtension) {
      extras.resource_subtype = 'File';
      
      try {
        const u = new URL(name);
        const pathSegs = u.pathname.split('/').filter(Boolean);
        const fileName = (pathSegs[pathSegs.length - 1] || '').trim();
        
        // Extract file name and extension
        if (fileName) {
          extras.file_name = fileName;
          const dotIdx = fileName.lastIndexOf('.');
          if (dotIdx > 0 && dotIdx < fileName.length - 1) {
            const extWithQuery = fileName.substring(dotIdx + 1);
            // Remove query params from extension
            extras.file_extension = extWithQuery.split('?')[0].toLowerCase();
          }
        }
        
        // Extract service based on URL patterns
        const hostname = u.hostname;
        
        // Pattern 1: https://static.parastorage.com
        if (name.startsWith('https://static.parastorage.com')) {
          if (pathSegs.length >= 1) {
            extras.file_type = pathSegs[0];
            
            if (extras.file_type === 'unpkg') {
              // For unpkg, service is 'unpkg'
              extras.service = 'unpkg';
            } else if (extras.file_type === 'services' && pathSegs.length >= 2) {
              // For services path, extract service name
              extras.service = pathSegs[1];
            } else {
              // For other paths under static.parastorage.com
              extras.service = extras.file_type;
            }
          }
        }
        // Pattern 2: https://[APP_ID].wixappcloud.com/browser/assets
        else if (hostname.endsWith('.wixappcloud.com') && u.pathname.startsWith('/browser/assets')) {
          // Extract APP_ID (everything before first dot)
          const appId = hostname.split('.')[0];
          extras.service = appId;
        }
        // Pattern 3: Other domains
        else {
          extras.service = 'other';
        }
      } catch {}
    }
  } catch {}
  return extras;
}

export function getEffectiveType(event: PerformanceEntry, siteModels?: PerformanceData['siteModels']): string {
  if (event.entryType === 'resource') {
    const ex = getResourceExtras(event.name, siteModels);
    if (ex.resource_subtype === 'File') return 'resource:file';
    if (ex.resource_subtype === 'API') return 'resource:api';
    return 'resource';
  }
  return event.entryType;
}

export function getDisplayResourceName(name: string, externalBaseUrl?: string): string {
  const base = externalBaseUrl;
  if (!base) return name;
  try {
    const variants: string[] = [];
    const withSlash = base.endsWith('/') ? base : base + '/';
    const withoutSlash = base.endsWith('/') ? base.slice(0, -1) : base;
    variants.push(withSlash, withoutSlash);
    try {
      const u = new URL(base);
      variants.push(u.origin, u.origin + '/');
    } catch {}
    for (const v of variants) {
      if (name.startsWith(v)) {
        const rest = name.slice(v.length).replace(/^\/+/, '');
        return rest || '/';
      }
    }
    return name;
  } catch {
    return name;
  }
}

