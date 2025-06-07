const hudElm = document.getElementById('HUD');
const readOutsElm = document.createElement('table');
const displayElms = {};

for (const disp of ['power', 'angle', 'titanium', 'antimatter', 'metamaterials']) {
  const rowElm = document.createElement('tr');
  const descElm = document.createElement('td');
  descElm.textContent = disp.charAt(0).toUpperCase() + disp.slice(1);
  displayElms[disp] = document.createElement('td');
  rowElm.appendChild(descElm);
  rowElm.appendChild(displayElms[disp]);
  readOutsElm.appendChild(rowElm);
  hudElm.appendChild(readOutsElm);
}

const rangeElm = document.getElementById('worldSizeRange');
const numberElm = document.getElementById('worldSizeNumber');
const applyElm = document.getElementById('applyWorldSize');
let worldSizeChangeCb = null;
let worldGenerateCb = null;

function setupWorldSize (value) {
  rangeElm.value = value;
  numberElm.value = value;
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
  if (worldGenerateCb) worldGenerateCb(parseFloat(rangeElm.value));
});

function onWorldSizeChange (cb) {
  worldSizeChangeCb = cb;
}

function onGenerateWorld (cb) {
  worldGenerateCb = cb;
}

function showValue (name, value) {
  displayElms[name].textContent = value;
}

export {
  showValue,
  onWorldSizeChange,
  setupWorldSize,
  onGenerateWorld
};
