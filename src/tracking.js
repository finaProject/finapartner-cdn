// Tracking personalizado
document.addEventListener('DOMContentLoaded', function () {
  let contactSent = false;
  let initiateCheckoutSent = false;
  let watchVideoSent = false;
  let viewContentSent = false;
  const referrer = document.referrer;
  // RegEx para detectar Google
  const googleSearchRegex = /^https?:\/\/(www\.)?google\./i;
  let currentParams = new URLSearchParams(window.location.search);
  if (googleSearchRegex.test(referrer)) {
    // agrega si no existe, o actualiza si ya existe.
    currentParams.set('utm_source', 'google');
    currentParams.set('utm_medium', 'seo');
  }
  const targetLinks = document.querySelectorAll('a[href*="registro.finapartner.com"]');

  targetLinks.forEach(link => {
    try {
      // Creamos un objeto URL basado en el href del enlace actual
      const urlObj = new URL(link.href);

      // Fusionamos los parámetros globales (currentParams) dentro del enlace
      currentParams.forEach((value, key) => {
        urlObj.searchParams.set(key, value);
      });

      // Asignamos la nueva URL construida
      link.href = urlObj.toString();

    } catch (e) {
      console.error("Error procesando URL:", link.href, e);
    }
  });


  // if (queryParams && queryParams.includes("utm_")) {
  //   document.querySelectorAll('a[href*="registro.finapartner.com"]').forEach(link => {
  //     const href = link.getAttribute('href') || '';
  //     const baseUrl = href.split('?')[0];
      
  //     link.setAttribute('href', `${baseUrl}${queryParams}`);
  //   });
  // }

  
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