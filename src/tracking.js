// Constantes
const UTM_SOURCE_SEO = 'seo';
const UTM_SOURCE = 'utm_source';
const UTM_MEDIUM = 'utm_medium';
const COOKIE_KEY = 'current_params_session';

// Helpers cookie de sesión (sin expiración => se borra al cerrar navegador)
function setSessionCookie(name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`, 'path=/', 'samesite=lax'];
  if (opts.domain) parts.push(`domain=${opts.domain}`);
  document.cookie = parts.join('; ');
}
function getCookie(name) {
  const m = document.cookie.match(new RegExp('(?:^|; )' + name.replace(/[-[\]/{}()*+?.\\^$|]/g, '\\$&') + '=([^;]*)'));
  return m ? decodeURIComponent(m[1]) : '';
}
// Tracking personalizado
document.addEventListener('DOMContentLoaded', function () {
  let contactSent = false;
  let initiateCheckoutSent = false;
  let watchVideoSent = false;
  let viewContentSent = false;
  const referrer = document.referrer;
  const googleSearchRegex = /^https?:\/\/(www\.)?google\./i;

  const urlParams = new URLSearchParams(window.location.search);
  const hasUtm = [...urlParams.keys()].some(k => k.startsWith('utm_'));
  const fromGoogle = googleSearchRegex.test(referrer);

  let currentParams;
  const cookieStr = getCookie(COOKIE_KEY);

  // Prioridad:
  // 1) UTM en URL -> usar y guardar
  // 2) Referrer Google sin UTM -> setear SEO y guardar
  // 3) Sin UTM y no Google -> cargar cookie si existe
  // 4) Dejar URL tal cual
  if (hasUtm) {
    currentParams = urlParams;
    setSessionCookie(COOKIE_KEY, currentParams.toString(), { /* domain: '.finapartner.com' */ });
  } else if (fromGoogle) {
    currentParams = urlParams;
    currentParams.set(UTM_SOURCE, UTM_SOURCE_SEO);
    currentParams.set(UTM_MEDIUM, UTM_SOURCE_SEO);
    setSessionCookie(COOKIE_KEY, currentParams.toString(), { /* domain: '.finapartner.com' */ });
  } else if (cookieStr) {
    currentParams = new URLSearchParams(cookieStr);
  } else {
    currentParams = urlParams;
  }

  // Propagar a enlaces de registro
  document.querySelectorAll('a[href*="registro.finapartner.com"]').forEach(link => {
    try {
      const urlObj = new URL(link.href);
      currentParams.forEach((value, key) => urlObj.searchParams.set(key, value));
      link.href = urlObj.toString();
    } catch (e) {
      console.error('Error procesando URL:', link.href, e);
    }
  });

  
  
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
});

