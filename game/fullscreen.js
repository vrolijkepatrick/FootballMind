(() => {
  const root = document.documentElement;
  const request = root.requestFullscreen || root.webkitRequestFullscreen;
  const exit = document.exitFullscreen || document.webkitExitFullscreen;
  const navigation = document.querySelector('.fm-bottom-nav');
  if (!request || !exit || !navigation) return;

  const button = document.createElement('button');
  button.id = 'fmFullscreen';
  button.type = 'button';
  button.className = 'fm-nav-btn';
  navigation.appendChild(button);

  function active() {
    return Boolean(document.fullscreenElement || document.webkitFullscreenElement);
  }
  function update() {
    button.textContent = active() ? 'Normaal scherm' : 'Volledig scherm';
    button.setAttribute('aria-pressed', String(active()));
    button.title = active() ? 'Volledig scherm verlaten (ook met Esc)' : 'FootballMind op volledig scherm openen';
  }
  button.addEventListener('click', async () => {
    button.disabled = true;
    try {
      if (active()) await exit.call(document);
      else await request.call(root);
    } catch {
      if (typeof showMessage === 'function') showMessage('Deze browser laat volledig scherm hier niet toe. Open de spellink rechtstreeks in je browser.', true);
    } finally {
      button.disabled = false;
      update();
    }
  });
  document.addEventListener('fullscreenchange', update);
  document.addEventListener('webkitfullscreenchange', update);
  const style = document.createElement('style');
  style.textContent = '#fmFullscreen{min-height:44px;white-space:normal}html:fullscreen{background:#060605;overflow:auto}html:-webkit-full-screen{background:#060605;overflow:auto}';
  document.head.appendChild(style);
  update();
})();
