// Ejecuta el tracking real en jsdom y valida UTMs + persistencia por cookie de sesión.

(async () => {
    const fs = require('fs');
    const path = require('path');
    const { CookieJar } = (await import('jsdom'));
    const { JSDOM } = await import('jsdom');

    const trackingCode = fs.readFileSync(path.join(__dirname, '..', 'src', 'tracking.js'), 'utf8');

    const HTML = `
<!doctype html>
<html>
  <body>
    <a id="l1" href="https://registro.finapartner.com/signup">Regístrate</a>
    <a id="l2" href="https://registro.finapartner.com/promo?x=1">Promo</a>
  </body>
</html>`.trim();

    async function runOnce({ url, referrer, cookieJar }) {
        const dom = new JSDOM(HTML, {
            url,
            referrer,
            runScripts: 'dangerously',
            resources: 'usable',
            cookieJar
        });
        // Stubs para evitar errores en tracking
        dom.window.fbq = () => {};
        // Ejecuta el código real y dispara DOMContentLoaded
        dom.window.document.addEventListener('DOMContentLoaded', () => {});
        dom.window.eval(trackingCode);
        dom.window.document.dispatchEvent(new dom.window.Event('DOMContentLoaded', { bubbles: true }));
        const l1 = dom.window.document.getElementById('l1').href;
        const l2 = dom.window.document.getElementById('l2').href;
        return { l1, l2 };
    }

    function assertHasParams(href, expected) {
        const u = new URL(href);
        for (const [k, v] of Object.entries(expected)) {
            const got = u.searchParams.get(k);
            if (got !== v) {
                throw new Error(`Esperado ${k}=${v} en ${href}, recibido ${got}`);
            }
        }
    }

    function assertNotHasKeys(href, keys) {
        const u = new URL(href);
        for (const k of keys) {
            if (u.searchParams.has(k)) {
                throw new Error(`No se esperaba ${k} en ${href}`);
            }
        }
    }

    // Escenario 1: URL con UTM -> usar y guardar; siguiente ruta sin UTM -> reusar cookie
    {
        console.log('Escenario 1: UTM en URL (persisten al cambiar ruta)');
        const jar = new CookieJar();

        const r1 = await runOnce({
            url: 'https://site.test/?utm_source=Google&utm_medium=cpc&utm_campaign=search',
            referrer: 'https://bing.com/',
            cookieJar: jar
        });
        assertHasParams(r1.l1, { utm_source: 'Google', utm_medium: 'cpc', utm_campaign: 'search' });
        assertHasParams(r1.l2, { utm_source: 'Google', utm_medium: 'cpc', utm_campaign: 'search' });

        const r1b = await runOnce({
            url: 'https://site.test/otra-ruta',
            referrer: 'https://bing.com/',
            cookieJar: jar
        });
        assertHasParams(r1b.l1, { utm_source: 'Google', utm_medium: 'cpc', utm_campaign: 'search' });
        assertHasParams(r1b.l2, { utm_source: 'Google', utm_medium: 'cpc', utm_campaign: 'search' });
        console.log('OK escenario 1');
    }

    // Escenario 2: Referrer Google sin UTM -> setear seo/seo y guardar; siguiente ruta -> reusar cookie
    {
        console.log('Escenario 2: Referrer Google sin UTM (seo/seo y persiste)');
        const jar = new CookieJar();

        const r2 = await runOnce({
            url: 'https://site.test/',
            referrer: 'https://www.google.com/search?q=fina',
            cookieJar: jar
        });
        assertHasParams(r2.l1, { utm_source: 'seo', utm_medium: 'seo' });
        assertHasParams(r2.l2, { utm_source: 'seo', utm_medium: 'seo' });

        const r2b = await runOnce({
            url: 'https://site.test/otra',
            referrer: 'https://duckduckgo.com/',
            cookieJar: jar
        });
        assertHasParams(r2b.l1, { utm_source: 'seo', utm_medium: 'seo' });
        assertHasParams(r2b.l2, { utm_source: 'seo', utm_medium: 'seo' });
        console.log('OK escenario 2');
    }

    // Escenario 3: Sin UTM, no Google y sin cookie previa -> no tocar
    {
        console.log('Escenario 3: Sin UTM, no Google, sin cookie (no tocar)');
        const jar = new CookieJar();

        const r3 = await runOnce({
            url: 'https://site.test/',
            referrer: 'https://ejemplo.com/',
            cookieJar: jar
        });
        assertNotHasKeys(r3.l1, ['utm_source', 'utm_medium']);
        assertNotHasKeys(r3.l2, ['utm_source', 'utm_medium']);
        console.log('OK escenario 3');
    }

    // Escenario 4: Sobrescritura de cookie si llegan nuevas UTM
    {
        console.log('Escenario 4: Sobrescribir cookie si llegan nuevas UTM');
        const jar = new CookieJar();

        // Primero Google -> seo/seo
        await runOnce({
            url: 'https://site.test/',
            referrer: 'https://www.google.com/search?q=x',
            cookieJar: jar
        });

        // Luego nuevas UTM en URL -> deben sobrescribir (y persistir)
        const r4 = await runOnce({
            url: 'https://site.test/?utm_source=Facebook&utm_medium=paid&utm_campaign=retargeting',
            referrer: 'https://facebook.com/',
            cookieJar: jar
        });
        assertHasParams(r4.l1, { utm_source: 'Facebook', utm_medium: 'paid', utm_campaign: 'retargeting' });

        // Nueva ruta sin UTM -> deben mantenerse las últimas (Facebook/paid/retargeting)
        const r4b = await runOnce({
            url: 'https://site.test/next',
            referrer: 'https://example.com/',
            cookieJar: jar
        });
        assertHasParams(r4b.l1, { utm_source: 'Facebook', utm_medium: 'paid', utm_campaign: 'retargeting' });
        console.log('OK escenario 4');
    }

    console.log('\nTodas las pruebas pasaron ✅');
})().catch(err => {
    console.error('Fallo de prueba:', err);
    process.exit(1);
});