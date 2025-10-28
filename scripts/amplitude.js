// Amplitude Script
window.addEventListener('load', () => {
  setTimeout(() => {
    const s = document.createElement('script');
    s.src = "https://cdn.amplitude.com/script/91b92269e558bd283c9c3ba4fa2a39e9.js";
    s.defer = true;
    s.onload = () => {
      const i = setInterval(() => {
        if (window.amplitude?.getInstance) {
          clearInterval(i);
          amplitude.getInstance().init("91b92269e558bd283c9c3ba4fa2a39e9", null, {
            fetchRemoteConfig: true,
            autocapture: true
          });
        }
      }, 100);
    };
    document.head.appendChild(s);
  }, 1500);
});
