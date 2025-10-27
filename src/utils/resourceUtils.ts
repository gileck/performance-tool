import type { PerformanceEntry, PerformanceData, ResourceExtras } from '../types/performance';

export function getResourceExtras(name: string, siteModels?: PerformanceData['siteModels']): ResourceExtras {
  const extras: ResourceExtras = {};
  try {
    const staticPrefix = 'https://static.parastorage.com';
    if (name.startsWith(staticPrefix)) {
      // File subtype
      extras.resource_subtype = 'File';
      try {
        const u = new URL(name);
        const pathSegs = u.pathname.split('/').filter(Boolean);
        const fileName = (pathSegs[pathSegs.length - 1] || '').trim();
        // file_type is the first segment after the host
        if (pathSegs.length >= 1) {
          extras.file_type = pathSegs[0];
          if (extras.file_type === 'services' && pathSegs.length >= 2) {
            // service is the segment after 'services'
            extras.service = pathSegs[1];
          }
        }
        if (fileName) {
          extras.file_name = fileName;
          const dotIdx = fileName.lastIndexOf('.');
          if (dotIdx > 0 && dotIdx < fileName.length - 1) {
            extras.file_extension = fileName.substring(dotIdx + 1).toLowerCase();
          }
        }
      } catch {}
      return extras;
    }

    // Site API subtype
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

