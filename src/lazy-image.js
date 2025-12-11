document.addEventListener('DOMContentLoaded', () => {
    // Ajusta el selector a tu caso: por alt, por data-test-id, o por una clase del contenedor
    const hero = document.querySelector('img[alt*="hero"]') || document.querySelector('img[src*="hero"]');
    const lazyMedia = document.querySelectorAll('[data-lazy-src]');
    if (hero) hero.setAttribute('fetchpriority', 'high');
    const io = new IntersectionObserver(els => {
        els.forEach(e => {
            if (e.isIntersecting) {
                const el = e.target;
                el.src = el.dataset.lazySrc;
                el.removeAttribute('data-lazy-src');
                io.unobserve(el);
            }
        });
    }, { rootMargin: '200px' });
    lazyMedia.forEach(el => io.observe(el));
});
