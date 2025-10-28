// Tracking personalizado
document.addEventListener('DOMContentLoaded', function () {
  let contactSent = false;
  let initiateCheckoutSent = false;
  let watchVideoSent = false;
  let viewContentSent = false;

  const queryParams = window.location.search;
  if (queryParams && queryParams.includes("utm_")) {
    document.querySelectorAll('a[href*="registro.finapartner.com"]').forEach(link => {
      const href = link.getAttribute('href') || '';
      const baseUrl = href.split('?')[0];
      link.setAttribute('href', `${baseUrl}${queryParams}`);
    });
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
});