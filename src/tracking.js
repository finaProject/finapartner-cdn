// Constantes
const UTM_SOURCE_SEO = 'seo';
const UTM_SOURCE = 'utm_source';
const UTM_MEDIUM = 'utm_medium';
const COOKIE_KEY = 'current_params_session';
const PREFIX = 'TRACKING';
const DEBUG = false;
const log = DEBUG ? (...args) => console.log(`[${PREFIX}]`, ...args) : () => {};
// Helpers cookie de sesión (sin expiración => se borra al cerrar navegador)
function setSessionCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'Path=/', 'SameSite=Lax'];
  // Compartir entre subdominios SOLO si estás bajo *.finapartner.com:
  if (opts.domain) parts.push(`Domain=${opts.domain}`);
  if (location.protocol === 'https:') parts.push('Secure');
  document.cookie = parts.join('; ');
}
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}

// Determina opciones de cookie según dominio actual:
// - En producción bajo *.finapartner.com usa Domain=.finapartner.com para compartir entre subdominios
// - En local/otros hosts no fija Domain para permitir sobreescritura correcta
function getCookieOptsForCurrentHost() {
  const host = location.hostname || '';
  const opts = {};
  if (host === 'finapartner.com' || host.endsWith('.finapartner.com')) {
    opts.domain = '.finapartner.com';
  }
  return opts;
}

// Tracking personalizado
function initTracking() {
  let contactSent = false;
  let initiateCheckoutSent = false;
  let watchVideoSent = false;
  let viewContentSent = false;
  let reapplyTimer = null;
  const googleSearchRegex = /^https?:\/\/(www\.)?google\./i;

  // Cálculo de UTM con prioridades y persistencia temporal en cookie de sesión
 function computeCurrentParams() {
    // Si ya hay baseline en esta carga (SPA), siempre reusar
    if (window.__utmBaselineStr && typeof window.__utmBaselineStr === 'string') {
      return new URLSearchParams(window.__utmBaselineStr);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const hasUtm = [...urlParams.keys()].some(k => k.startsWith('utm_'));
    const cookieStr = getCookie(COOKIE_KEY);
    const fromGoogle = /^https?:\/\/(www\.)?google\./i.test(document.referrer);

    // Establece baseline solo una vez por carga de página:
    // 1) Si URL trae UTM → baseline = URL (y cookie)
    if (hasUtm) {
      const s = urlParams.toString();
      setSessionCookie(COOKIE_KEY, s, getCookieOptsForCurrentHost());
      window.__utmBaselineStr = s;
      return new URLSearchParams(s);
    }
    // 2) Si viene de Google (sin UTM) → baseline = seo/seo (y cookie)
    if (fromGoogle) {
      const params = new URLSearchParams(urlParams);
      params.set(UTM_SOURCE, UTM_SOURCE_SEO);
      params.set(UTM_MEDIUM, UTM_SOURCE_SEO);
      const s = params.toString();
      setSessionCookie(COOKIE_KEY, s, getCookieOptsForCurrentHost());
      window.__utmBaselineStr = s;
      return new URLSearchParams(s);
    }
    // 3) Si hay cookie previa (p.ej., cambio de página) → baseline = cookie
    if (cookieStr) {
      window.__utmBaselineStr = cookieStr;
      return new URLSearchParams(cookieStr);
    }
    // 4) Sin UTM, sin Google y sin cookie → baseline = URL tal cual (no cookie)
    const s = urlParams.toString();
    window.__utmBaselineStr = s;
    return new URLSearchParams(s);
  }

  function applyParamsToLinks(params) {
    log('applyParamsToLinks', params.toString());
    
    document.querySelectorAll('a[href*="registro.finapartner.com"]').forEach(link => {
      try {
        const urlObj = new URL(link.href);
        params.forEach((value, key) => urlObj.searchParams.set(key, value));
        link.href = urlObj.toString();
      } catch (e) {
        console.error('Error procesando URL:', link.href, e);
      }
      log('link', link.href);
    });
  }

  // Aplicar en carga inicial
  let currentParams = computeCurrentParams();
  log('currentParams:', currentParams.toString());
  applyParamsToLinks(currentParams);

  // Debounce para re-aplicar después de que el framework termine de renderizar
  function scheduleReapply() {
    if (reapplyTimer) clearTimeout(reapplyTimer);
    reapplyTimer = setTimeout(() => {
      currentParams = computeCurrentParams();
        log('reapply (debounced) currentParams:', currentParams.toString());
      applyParamsToLinks(currentParams);
      // Segundo pase tardío por si hay render async
      setTimeout(() => {
        const lateParams = computeCurrentParams();
        applyParamsToLinks(lateParams);
      }, 150);
    }, 50);
  }

  // Detectar navegación interna (SPA): pushState/replaceState/popstate/hashchange
  (function installLocationChangeHook() {
    if (window.__trackingSpaHookInstalled) return;
    window.__trackingSpaHookInstalled = true;
    const origPushState = history.pushState;
    const origReplaceState = history.replaceState;
    history.pushState = function () {
      const ret = origPushState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
      return ret;
    };
    history.replaceState = function () {
      const ret = origReplaceState.apply(this, arguments);
      window.dispatchEvent(new Event('locationchange'));
      return ret;
    };
    window.addEventListener('popstate', function () {
      window.dispatchEvent(new Event('locationchange'));
    });
    window.addEventListener('hashchange', function () {
      window.dispatchEvent(new Event('locationchange'));
    });
  })();

  // Re-aplicar UTM cuando cambie la URL dentro de la misma sesión/página
  window.addEventListener('locationchange', function () {
    scheduleReapply();
  });

  // Observar inserciones de nodos (enlaces renderizados dinámicamente)
  try {
    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        if (m.addedNodes && m.addedNodes.length > 0) {
          scheduleReapply();
          break;
        }
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  } catch (e) {
    // Si MutationObserver no está disponible, ignorar silenciosamente
  }


  
  
  document.querySelectorAll('a').forEach(link => {
    link.addEventListener('click', function () {
      if (typeof fbq !== 'undefined') {
        const href = link.getAttribute('href') || '';
        if (href.startsWith('https://wa.me/') && !contactSent) {
          fbq('track', 'Contact');
          contactSent = true;
        } else if (href.includes('registro.finapartner.com') && !initiateCheckoutSent) {
          fbq('track', 'RegistroIniciado');
          initiateCheckoutSent = true;
        }
      }
    });
  });

  const videoContainer = document.querySelector('article[role="presentation"]');
  if (videoContainer) {
    videoContainer.addEventListener('click', function () {
      if (typeof fbq !== 'undefined' && !watchVideoSent) {
        fbq('track', 'WatchVideo');
        watchVideoSent = true;
      }
    });
  }

  window.addEventListener('scroll', function () {
    const scrollY = window.scrollY || window.pageYOffset;
    const triggerPoint = document.body.scrollHeight * 0.3;
    if (!viewContentSent && scrollY > triggerPoint) {
      if (typeof fbq !== 'undefined') {
        fbq('track', 'ViewContent');
        viewContentSent = true;
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initTracking, { once: true });
} else {
  // Si el script se carga tras DOMContentLoaded, ejecuta inmediatamente
  initTracking();
}

