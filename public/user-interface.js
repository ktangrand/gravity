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

function showValue (name, value) {
  displayElms[name].textContent = value;
}

export {
  showValue
};
