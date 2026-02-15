const displayElms = {
  power: document.getElementById('val-power'),
  angle: document.getElementById('val-angle'),
  titanium: document.getElementById('val-titanium'),
  antimatter: document.getElementById('val-antimatter'),
  metamaterials: document.getElementById('val-metamaterials')
};

const rangeElm = document.getElementById('worldSizeRange');
const numberElm = document.getElementById('worldSizeNumber');
const planetCountElm = document.getElementById('planetCountNumber');
const gravityScaleElm = document.getElementById('gravityScale');
const applyElm = document.getElementById('applyWorldSize');
const settingsPanel = document.getElementById('worldSizeControl');
const toggleSettingsBtn = document.getElementById('toggle-settings-btn');

let worldSizeChangeCb = null;
let worldGenerateCb = null;

function setupWorldSize (value, planetCount, gravityScale) {
  rangeElm.value = value;
  numberElm.value = value;
  if (planetCount !== undefined) planetCountElm.value = planetCount;
  if (gravityScale !== undefined) gravityScaleElm.value = gravityScale;
}

rangeElm.addEventListener('input', () => { numberElm.value = rangeElm.value; });
rangeElm.addEventListener('change', () => {
  if (worldSizeChangeCb) worldSizeChangeCb(parseFloat(rangeElm.value));
});
numberElm.addEventListener('input', () => { rangeElm.value = numberElm.value; });
numberElm.addEventListener('change', () => {
  if (worldSizeChangeCb) worldSizeChangeCb(parseFloat(numberElm.value));
});

applyElm.addEventListener('click', () => {
  if (worldGenerateCb) {
    worldGenerateCb({
      size: parseFloat(rangeElm.value),
      planetCount: parseInt(planetCountElm.value),
      gravityScale: parseFloat(gravityScaleElm.value)
    });
  }
});

toggleSettingsBtn.addEventListener('click', () => {
  const visible = settingsPanel.style.display !== 'none';
  settingsPanel.style.display = visible ? 'none' : 'flex';
});

function onWorldSizeChange (cb) {
  worldSizeChangeCb = cb;
}

function onGenerateWorld (cb) {
  worldGenerateCb = cb;
}

function showValue (name, value) {
  if (displayElms[name]) {
    displayElms[name].textContent = value;
  }
}

function showNotification (message) {
  const el = document.createElement('div');
  el.className = 'notification';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 3000);
}

function showOverlay (title, message) {
  let overlay = document.getElementById('game-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'game-overlay';
    document.body.appendChild(overlay);
  }
  overlay.innerHTML = `<h1>${title}</h1><p>${message}</p>`;
  overlay.style.display = 'flex';
}

export {
  showValue,
  showNotification,
  showOverlay,
  onWorldSizeChange,
  setupWorldSize,
  onGenerateWorld
};
