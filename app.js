// ===== STATE =====
let currentView = 'grid';
let activeZone = 'all';
let activeStars = 'all';
let maxPrice = 500;
let searchQuery = '';
let sortCol = null;
let sortDir = 1;
let selectedDate = '2026-04-02';
let selectedNights = 2;

// ===== THEME =====
(function(){
  const r = document.documentElement;
  let d = matchMedia('(prefers-color-scheme:dark)').matches ? 'dark' : 'light';
  r.setAttribute('data-theme', d);
  const btn = document.querySelector('[data-theme-toggle]');
  if(btn) btn.addEventListener('click', () => {
    d = d === 'dark' ? 'light' : 'dark';
    r.setAttribute('data-theme', d);
    btn.innerHTML = d === 'dark'
      ? '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>'
      : '<svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>';
  });
})();

// ===== DATE HELPERS =====
const FR_DAYS = ['Dim.', 'Lun.', 'Mar.', 'Mer.', 'Jeu.', 'Ven.', 'Sam.'];
const FR_MONTHS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];

function formatDateFR(dateStr) {
  const d = new Date(dateStr + 'T12:00:00');
  return `${FR_DAYS[d.getDay()]} ${d.getDate()} ${FR_MONTHS[d.getMonth()]}`;
}

function addDays(dateStr, n) {
  const d = new Date(dateStr + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return d.toISOString().split('T')[0];
}

function updateDateUI() {
  const departDate = addDays(selectedDate, selectedNights);
  document.getElementById('date-depart-display').textContent = formatDateFR(departDate);
  document.getElementById('nights-display').textContent = selectedNights;
  document.getElementById('dp-sejour-text').textContent =
    `${formatDateFR(selectedDate)} → ${selectedNights} nuit${selectedNights > 1 ? 's' : ''}`;

  // Hero stat
  const target = CAMPINGS.find(c => c.is_target);
  if (target) {
    const px = getPrixSejour(target, selectedDate, selectedNights);
    document.getElementById('stat-prix-label').textContent =
      `${px.total_min}€ – ${px.total_max}€`;
    document.getElementById('stat-prix-sub').textContent =
      `Tour des Prises · ${selectedNights} nuit${selectedNights > 1 ? 's' : ''}`;
  }
}

// ===== DATE PICKER EVENTS =====
document.getElementById('date-arrival').addEventListener('change', e => {
  selectedDate = e.target.value;
  updateDateUI();
  refresh();
  if(currentView === 'chart') { destroyCharts(); buildCharts(); }
});

document.getElementById('nights-minus').addEventListener('click', () => {
  if (selectedNights > 1) { selectedNights--; updateDateUI(); refresh(); if(currentView==='chart'){destroyCharts();buildCharts();} }
});

document.getElementById('nights-plus').addEventListener('click', () => {
  if (selectedNights < 30) { selectedNights++; updateDateUI(); refresh(); if(currentView==='chart'){destroyCharts();buildCharts();} }
});

document.getElementById('dp-reset').addEventListener('click', () => {
  selectedDate = '2026-04-02';
  selectedNights = 2;
  document.getElementById('date-arrival').value = selectedDate;
  updateDateUI();
  refresh();
  if(currentView === 'chart') { destroyCharts(); buildCharts(); }
});

// ===== CURRENT PRIX =====
function getPrix(camping) {
  return getPrixSejour(camping, selectedDate, selectedNights);
}

// ===== FILTERS =====
function getFiltered() {
  return CAMPINGS.filter(c => {
    if (activeZone !== 'all' && c.zone !== activeZone) return false;
    if (activeStars !== 'all' && c.etoiles !== parseInt(activeStars)) return false;
    const px = getPrix(c);
    if (px.max > maxPrice && px.min > maxPrice) return false;
    if (searchQuery && !c.nom.toLowerCase().includes(searchQuery) && !c.commune.toLowerCase().includes(searchQuery)) return false;
    return true;
  });
}

// ===== STARS =====
function renderStars(n) {
  let s = '';
  for(let i=0;i<5;i++) s += `<span class="${i < n ? 'star-on' : 'star-off'}">★</span>`;
  return s;
}

// ===== BADGE POSITIONNEMENT =====
const posColors = {
  'Luxe & bien-être': 'badge-purple',
  'Ultra-luxe boutique': 'badge-gold',
  'Éco-luxe & slow life': 'badge-green',
  'Calme & nature': 'badge-blue',
  'Nature & écologie': 'badge-green',
  'Qualité & sérénité': 'badge-teal',
  'Familial haut de gamme': 'badge-orange',
  'Familial animé': 'badge-orange',
  'Familial accessible': 'badge-orange',
  'Familial bord de mer': 'badge-orange',
  'Familial label Camping Paradis': 'badge-orange',
  'Volume & rapport qualité-prix': 'badge-default',
  'Luxe intime': 'badge-purple',
  'Nature & authenticité': 'badge-green',
  'Premium bord de mer': 'badge-teal',
  'Pratique & central': 'badge-default',
  'Budget / entrée de gamme': 'badge-default',
};
function posBadge(p) {
  return `<span class="badge ${posColors[p] || 'badge-default'}">${p}</span>`;
}

// ===== CARD RENDER =====
function renderCard(c) {
  const px = getPrix(c);
  const noteStr = c.note ? `${c.note}/5` : 'N/D';
  const avisStr = c.nb_avis ? `${c.nb_avis} avis` : '';
  const hasTotal = px.total_min != null && selectedNights > 1;
  return `
    <div class="card ${c.is_target ? 'card-target' : ''}" data-id="${c.id}" tabindex="0" role="button">
      ${c.is_target ? '<div class="card-target-badge">Votre camping</div>' : ''}
      <div class="card-header">
        <div class="card-stars">${renderStars(c.etoiles)}</div>
        <div class="card-zone">${c.zone === 'ile-de-re' ? 'Île de Ré' : 'La Rochelle'}</div>
      </div>
      <h3 class="card-name">${c.nom}</h3>
      <p class="card-commune">${c.commune}</p>
      <div class="card-pos">${posBadge(c.positionnement)}</div>
      <div class="card-price">
        <div class="price-nuit">${px.min}€ – ${px.max}€ <span class="price-unit">/nuit</span></div>
        ${hasTotal ? `<div class="price-total-line">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          Total ${selectedNights} nuits : <strong>${px.total_min}€ – ${px.total_max}€</strong>
        </div>` : ''}
      </div>
      <div class="card-footer">
        <div class="card-note">
          <span class="note-val">${noteStr}</span>
          ${avisStr ? `<span class="note-avis">${avisStr}</span>` : ''}
        </div>
        ${c.url ? `<a href="${c.url}" target="_blank" rel="noopener" class="btn-ext" onclick="event.stopPropagation()">Site →</a>` : ''}
      </div>
    </div>
  `;
}

// ===== GRID =====
function renderGrid() {
  const filtered = getFiltered();
  const container = document.getElementById('cards-container');
  const noResults = document.getElementById('no-results');
  if (!filtered.length) { container.innerHTML = ''; noResults.classList.remove('hidden'); return; }
  noResults.classList.add('hidden');
  const sorted = [...filtered].sort((a, b) => {
    if (a.is_target && !b.is_target) return -1;
    if (!a.is_target && b.is_target) return 1;
    return b.etoiles - a.etoiles || (b.note||0) - (a.note||0);
  });
  container.innerHTML = sorted.map(renderCard).join('');
  container.querySelectorAll('.card').forEach(el => {
    el.addEventListener('click', () => openModal(parseInt(el.dataset.id)));
    el.addEventListener('keydown', e => { if(e.key === 'Enter') openModal(parseInt(el.dataset.id)); });
  });
}

// ===== TABLE =====
function renderTable() {
  // Update column header
  const thTotal = document.getElementById('th-total');
  if(thTotal) thTotal.innerHTML = `Total ${selectedNights}n <span class="sort-icon">↕</span>`;

  let filtered = getFiltered();
  if(sortCol) {
    filtered.sort((a,b) => {
      let va, vb;
      if(sortCol === 'nom') { return a.nom.localeCompare(b.nom) * sortDir; }
      if(sortCol === 'commune') { return a.commune.localeCompare(b.commune) * sortDir; }
      if(sortCol === 'etoiles') { va = a.etoiles; vb = b.etoiles; }
      else if(sortCol === 'note') { va = a.note||0; vb = b.note||0; }
      else if(sortCol === 'prix_min') { va = getPrix(a).min; vb = getPrix(b).min; }
      else if(sortCol === 'prix_max') { va = getPrix(a).max; vb = getPrix(b).max; }
      else if(sortCol === 'total') { va = getPrix(a).total_min||0; vb = getPrix(b).total_min||0; }
      else { va = 0; vb = 0; }
      return (va - vb) * sortDir;
    });
  }
  const tbody = document.getElementById('table-body');
  tbody.innerHTML = filtered.map(c => {
    const px = getPrix(c);
    return `
    <tr class="${c.is_target ? 'row-target' : ''}" data-id="${c.id}" style="cursor:pointer">
      <td><strong>${c.is_target ? '⭐ ' : ''}${c.nom}</strong></td>
      <td>${c.commune}</td>
      <td class="stars-cell">${renderStars(c.etoiles)}</td>
      <td>${c.note ? `<span class="note-chip">${c.note}</span>` : '—'}</td>
      <td class="price-cell">${px.min}€</td>
      <td class="price-cell">${px.max}€</td>
      <td class="price-cell total-cell">${px.total_min != null ? `${px.total_min}€ – ${px.total_max}€` : '—'}</td>
      <td>${posBadge(c.positionnement)}</td>
      <td>${c.url ? `<a href="${c.url}" target="_blank" rel="noopener" class="table-link">Visiter →</a>` : '—'}</td>
    </tr>`;
  }).join('');
  tbody.querySelectorAll('tr').forEach(row => {
    row.addEventListener('click', () => openModal(parseInt(row.dataset.id)));
  });
}

// ===== CHARTS =====
let chartsBuilt = false;
let chartInstances = {};
let selectedChartIds = null; // null = tous sélectionnés
let prixMode = 'max';  // 'min' | 'moy' | 'max'
let totalMode = 'min'; // 'min' | 'moy' | 'max'

function getSelectedCampings() {
  if (!selectedChartIds) return CAMPINGS;
  return CAMPINGS.filter(c => selectedChartIds.has(c.id));
}

// ===== SÉLECTEUR CAMPINGS GRAPHIQUES =====
function initChartSelector() {
  const container = document.getElementById('chart-selector-chips');
  if (!container || container.dataset.initialized) return;
  container.dataset.initialized = 'true';

  if (!selectedChartIds) {
    selectedChartIds = new Set(CAMPINGS.map(c => c.id));
  }

  function renderChips() {
    container.innerHTML = '';
    CAMPINGS.forEach(c => {
      const chip = document.createElement('button');
      chip.className = 'chart-chip' +
        (c.is_target ? ' chart-chip--target' : '') +
        (selectedChartIds.has(c.id) ? ' chart-chip--active' : '');
      chip.dataset.id = c.id;
      chip.innerHTML = `<span class="chip-stars">${'★'.repeat(c.etoiles)}</span><span class="chip-nom">${c.nom}</span>`;
      chip.addEventListener('click', () => {
        if (selectedChartIds.has(c.id)) {
          if (selectedChartIds.size > 1) selectedChartIds.delete(c.id);
        } else {
          selectedChartIds.add(c.id);
        }
        renderChips();
        updateAllBtn();
        destroyCharts();
        buildCharts();
      });
      container.appendChild(chip);
    });
  }

  function updateAllBtn() {
    const btn = document.getElementById('chart-select-all');
    if (!btn) return;
    const allSelected = selectedChartIds.size === CAMPINGS.length;
    btn.textContent = allSelected ? 'Aucun' : 'Tous';
    btn.classList.toggle('chart-select-all--active', allSelected);
  }

  document.getElementById('chart-select-all').addEventListener('click', () => {
    if (selectedChartIds.size === CAMPINGS.length) {
      // Désélectionner tout sauf La Tour des Prises
      selectedChartIds = new Set([1]);
    } else {
      selectedChartIds = new Set(CAMPINGS.map(c => c.id));
    }
    renderChips();
    updateAllBtn();
    destroyCharts();
    buildCharts();
  });

  renderChips();
  updateAllBtn();
}

function destroyCharts() {
  Object.values(chartInstances).forEach(c => { try { c.destroy(); } catch(e){} });
  chartInstances = {};
  chartsBuilt = false;
}

// ===== TOGGLE MIN/MOY/MAX =====
document.getElementById('prix-mode-toggle').addEventListener('click', e => {
  const btn = e.target.closest('[data-mode]');
  if (!btn) return;
  prixMode = btn.dataset.mode;
  document.querySelectorAll('.prix-mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  rebuildPrixChart();
});

// ===== TOGGLE TOTAL MIN/MOY/MAX =====
document.getElementById('total-mode-toggle').addEventListener('click', e => {
  const btn = e.target.closest('[data-tmode]');
  if (!btn) return;
  totalMode = btn.dataset.tmode;
  document.querySelectorAll('#total-mode-toggle .prix-mode-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  rebuildTotalChart();
});

function rebuildTotalChart() {
  if (chartInstances.notes) {
    chartInstances.notes.destroy();
    delete chartInstances.notes;
  }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#cdccca' : '#28251d';
  const gridColor = isDark ? '#393836' : '#dcd9d5';
  const targetColor = '#2a9bc4';
  const greenColor = '#6daa45';
  const activeCampings = getSelectedCampings();

  function getTotalModeVal(c) {
    const px = getPrix(c);
    if (totalMode === 'min') return px.total_min || 0;
    if (totalMode === 'max') return px.total_max || 0;
    // moy : moyenne de total_min et total_max
    return (px.total_min && px.total_max)
      ? Math.round((px.total_min + px.total_max) / 2)
      : (px.total_min || px.total_max || 0);
  }
  const modeLabels = { min: 'minimum', moy: 'moyen', max: 'maximum' };
  const modeLabel = modeLabels[totalMode];

  const totalData = [...activeCampings]
    .filter(c => getTotalModeVal(c) > 0)
    .sort((a, b) => getTotalModeVal(a) - getTotalModeVal(b));

  const t2 = document.getElementById('chart-title-total');
  if (t2) t2.textContent = `Total ${modeLabel} séjour — ${selectedNights} nuit${selectedNights > 1 ? 's' : ''}`;

  const ctx2 = document.getElementById('chart-notes').getContext('2d');
  chartInstances.notes = new Chart(ctx2, {
    type: 'bar',
    data: {
      labels: totalData.map(c => c.nom.length > 22 ? c.nom.slice(0, 22) + '…' : c.nom),
      datasets: [{
        label: `Total ${modeLabel} (€)`,
        data: totalData.map(c => getTotalModeVal(c)),
        backgroundColor: totalData.map(c => c.is_target ? targetColor : greenColor + 'cc'),
        borderColor: totalData.map(c => c.is_target ? targetColor : greenColor),
        borderWidth: 1, borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` ${ctx.raw}€ (total ${modeLabel})` } }
      },
      scales: {
        x: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } },
        y: { ticks: { color: textColor, font: { size: 11 } }, grid: { color: gridColor } }
      }
    }
  });
}

function rebuildPrixChart() {
  if (chartInstances.prix) {
    chartInstances.prix.destroy();
    delete chartInstances.prix;
  }
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#cdccca' : '#28251d';
  const gridColor = isDark ? '#393836' : '#dcd9d5';
  const accentColor = '#e8943a';
  const targetColor = '#2a9bc4';
  const outlierColor = '#9b5de5'; // violet pour Le Phare
  const activeCampings = getSelectedCampings();

  function getPrixModeValLocal(c) {
    const px = getPrix(c);
    if (prixMode === 'min') return px.min;
    if (prixMode === 'moy') return Math.round((px.min + px.max) / 2);
    return px.max;
  }
  const modeLabels = { min: 'min', moy: 'moyen', max: 'max' };
  const modeLabel = modeLabels[prixMode];
  const prixData = [...activeCampings].sort((a,b) => getPrixModeValLocal(b) - getPrixModeValLocal(a));

  // Calculer l'échelle max sans les outliers pour ne pas écraser le graphique
  const normalCampings = prixData.filter(c => !c.outlier);
  const normalMax = normalCampings.length
    ? Math.max(...normalCampings.map(c => getPrixModeValLocal(c)))
    : 500;
  // Cap de l'axe X : 20% au-dessus du max normal, sauf si aucun outlier actif
  const hasActiveOutlier = prixData.some(c => c.outlier && getPrixModeValLocal(c) > normalMax);
  const xMax = hasActiveOutlier ? Math.ceil(normalMax * 1.25 / 50) * 50 : undefined;

  const ctx1 = document.getElementById('chart-prix').getContext('2d');
  const t1 = document.getElementById('chart-title-prix');
  if(t1) t1.textContent = `Prix ${modeLabel}/nuit — ${formatDateFR(selectedDate)}, ${selectedNights} nuit${selectedNights>1?'s':''}`;

  // Plugin custom : afficher la vraie valeur tronquée au bout des barres outlier
  const outlierLabelPlugin = {
    id: 'outlierLabel',
    afterDatasetsDraw(chart) {
      if (!hasActiveOutlier) return;
      const { ctx: c, scales: { x, y } } = chart;
      chart.data.labels.forEach((label, i) => {
        const camping = prixData[i];
        if (!camping || !camping.outlier) return;
        const realVal = getPrixModeValLocal(camping);
        if (!realVal) return;
        const xPos = x.getPixelForValue(xMax || realVal);
        const yPos = y.getPixelForValue(i);
        c.save();
        c.fillStyle = outlierColor;
        c.font = 'bold 11px Inter, sans-serif';
        c.textAlign = 'left';
        c.fillText(`▶ ${realVal}€`, xPos + 4, yPos + 4);
        c.restore();
      });
    }
  };

  chartInstances.prix = new Chart(ctx1, {
    type: 'bar',
    plugins: [outlierLabelPlugin],
    data: {
      labels: prixData.map(c => c.nom.length > 22 ? c.nom.slice(0,22)+'…' : c.nom),
      datasets: [{
        label: `Prix ${modeLabel}/nuit (€)`,
        data: prixData.map(c => {
          const v = getPrixModeValLocal(c);
          // Tronquer les outliers à xMax pour garder l'échelle lisible
          return (c.outlier && xMax && v > xMax) ? xMax : v;
        }),
        backgroundColor: prixData.map(c =>
          c.is_target ? targetColor :
          c.outlier   ? outlierColor + 'bb' :
          accentColor + 'cc'
        ),
        borderColor: prixData.map(c =>
          c.is_target ? targetColor :
          c.outlier   ? outlierColor :
          accentColor
        ),
        borderWidth: 1, borderRadius: 4,
      }]
    },
    options: {
      responsive: true, maintainAspectRatio: false, indexAxis: 'y',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (ctx) => {
              const camping = prixData[ctx.dataIndex];
              const realVal = getPrixModeValLocal(camping);
              if (camping && camping.outlier && xMax && realVal > xMax) {
                return ` ${realVal}€/nuit (${modeLabel}) — échelle tronquée`;
              }
              return ` ${realVal}€/nuit (${modeLabel})`;
            }
          }
        }
      },
      scales: {
        x: {
          max: xMax,
          ticks: { color: textColor, font:{size:11} },
          grid: { color: gridColor }
        },
        y: { ticks: { color: textColor, font:{size:11} }, grid: { color: gridColor } }
      }
    }
  });
}

function buildCharts() {
  if(chartsBuilt) return;
  chartsBuilt = true;

  initChartSelector();

  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#cdccca' : '#28251d';
  const gridColor = isDark ? '#393836' : '#dcd9d5';
  const accentColor = '#e8943a';
  const targetColor = '#2a9bc4';

  const activeCampings = getSelectedCampings();

  // Chart 1 — délégué à rebuildPrixChart() (gère outliers + mode min/moy/max)
  rebuildPrixChart();

  // Chart 2 — délégué à rebuildTotalChart()
  rebuildTotalChart();

  // Chart 3 — Scatter Prix max/nuit vs Étoiles
  // Jitter vertical léger pour éviter superposition sur même niveau d'étoiles
  const jitter = () => (Math.random() - 0.5) * 0.18;
  const scatterAll = activeCampings;
  const ctx3 = document.getElementById('chart-scatter').getContext('2d');
  chartInstances.scatter = new Chart(ctx3, {
    type: 'scatter',
    data: {
      datasets: [
        {
          label: 'Concurrents',
          data: scatterAll.filter(c => !c.is_target).map(c => ({
            x: getPrix(c).max,
            y: c.etoiles + jitter(),
            etoiles: c.etoiles,
            nom: c.nom,
            nb_avis: c.nb_avis || 0
          })),
          backgroundColor: accentColor + 'bb',
          borderColor: accentColor,
          pointRadius: scatterAll.filter(c => !c.is_target).map(c => {
            const avis = c.nb_avis || 100;
            return Math.max(6, Math.min(16, 5 + Math.sqrt(avis) / 12));
          }),
          pointHoverRadius: 12,
        },
        {
          label: 'La Tour des Prises',
          data: scatterAll.filter(c => c.is_target).map(c => ({
            x: getPrix(c).max,
            y: c.etoiles,
            etoiles: c.etoiles,
            nom: c.nom,
            nb_avis: c.nb_avis || 0
          })),
          backgroundColor: targetColor,
          borderColor: '#1b3a6b',
          borderWidth: 2,
          pointRadius: 13,
          pointStyle: 'star',
          pointHoverRadius: 16,
        }
      ]
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor, font: { size: 12 } } },
        tooltip: {
          callbacks: {
            label: ctx => {
              const d = ctx.raw;
              const avisStr = d.nb_avis ? ` · ${d.nb_avis} avis` : '';
              return `${d.nom} — ${d.x}€/nuit | ${d.etoiles}★${avisStr}`;
            }
          }
        }
      },
      scales: {
        x: {
          title: { display: true, text: 'Prix max/nuit (€)', color: textColor, font: { size: 12 } },
          ticks: { color: textColor },
          grid: { color: gridColor }
        },
        y: {
          title: { display: true, text: 'Classement officiel (★)', color: textColor, font: { size: 12 } },
          min: 2.5,
          max: 5.5,
          ticks: {
            color: textColor,
            stepSize: 1,
            callback: val => {
              const v = Math.round(val);
              if (v === 3) return '★★★ (3★)';
              if (v === 4) return '★★★★ (4★)';
              if (v === 5) return '★★★★★ (5★)';
              return '';
            }
          },
          grid: { color: gridColor }
        }
      }
    }
  });

  // Chart 4 — Évolution mensuelle (5 campings clés, ignoré par le sélecteur)
  const keyIds = [1, 3, 5, 13, 14];
  const months = ['Janv','Févr','Mars','Avr','Mai','Juin','Juil','Août','Sept','Oct','Nov','Déc'];
  const monthDates = ['2026-01-15','2026-02-15','2026-03-15','2026-04-15','2026-05-15','2026-06-15',
                      '2026-07-15','2026-08-15','2026-09-15','2026-10-15','2026-11-15','2026-12-15'];
  const palette = ['#2a9bc4','#e8943a','#a12c55','#437a22','#6b3db8'];
  const ctx4 = document.getElementById('chart-stars').getContext('2d');
  chartInstances.stars = new Chart(ctx4, {
    type: 'line',
    data: {
      labels: months,
      datasets: keyIds.map((id, i) => {
        const c = CAMPINGS.find(x => x.id === id);
        return {
          label: c.nom.length > 20 ? c.nom.slice(0,20)+'…' : c.nom,
          data: monthDates.map(md => getPrixForDate(c, md).max),
          borderColor: palette[i],
          backgroundColor: palette[i] + '18',
          pointBackgroundColor: palette[i],
          pointRadius: 4, tension: 0.3, fill: false,
          borderWidth: c.is_target ? 3 : 1.5,
        };
      })
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: {
        legend: { position: 'bottom', labels: { color: textColor, padding: 10, font:{size:10} } },
        tooltip: { callbacks: { label: ctx => ` ${ctx.dataset.label}: ${ctx.raw}€/nuit max` } }
      },
      scales: {
        x: { ticks: { color: textColor, font:{size:10} }, grid: { color: gridColor } },
        y: { title: { display: true, text: '€/nuit max', color: textColor }, ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });
}

// ===== MODAL =====
function openModal(id) {
  const c = CAMPINGS.find(x => x.id === id);
  if(!c) return;
  const px = getPrix(c);
  const overlay = document.getElementById('modal-overlay');
  const body = document.getElementById('modal-body');

  // Tableau comparatif des tarifs par mois
  const monthRows = [
    { label: 'Janv – Mars', date: '2026-02-01' },
    { label: 'Avr – Pâques', date: '2026-04-11' },
    { label: 'Mai – Juin', date: '2026-05-15' },
    { label: 'Juillet', date: '2026-07-15' },
    { label: 'Août', date: '2026-08-15' },
    { label: 'Sept – Oct', date: '2026-09-15' },
  ].map(row => {
    const p = getPrixForDate(c, row.date);
    const isActive = (() => {
      // Check si la date sélectionnée est dans cette tranche approximative
      const arr = new Date(selectedDate + 'T12:00:00');
      const ref = new Date(row.date + 'T12:00:00');
      return arr.getMonth() === ref.getMonth();
    })();
    return `<tr class="${isActive ? 'saison-row-active' : ''}">
      <td><strong>${row.label}</strong></td>
      <td class="price-cell">${p.min}€</td>
      <td class="price-cell">${p.max}€</td>
      <td class="price-cell semaine-cell">~${p.semaine}€</td>
    </tr>`;
  }).join('');

  body.innerHTML = `
    <div class="modal-header ${c.is_target ? 'modal-target' : ''}">
      ${c.is_target ? '<div class="modal-target-label">⭐ Votre camping</div>' : ''}
      <div class="modal-stars">${renderStars(c.etoiles)}</div>
      <h2 class="modal-name">${c.nom}</h2>
      <p class="modal-commune">${c.commune} · ${c.zone === 'ile-de-re' ? 'Île de Ré' : 'La Rochelle'}</p>
      ${posBadge(c.positionnement)}
    </div>

    <div class="modal-sejour-banner">
      <div class="msb-item">
        <span class="msb-label">Arrivée</span>
        <span class="msb-val">${formatDateFR(selectedDate)}</span>
      </div>
      <div class="msb-arrow">→</div>
      <div class="msb-item">
        <span class="msb-label">Départ</span>
        <span class="msb-val">${formatDateFR(addDays(selectedDate, selectedNights))}</span>
      </div>
      <div class="msb-item msb-nights">
        <span class="msb-label">Durée</span>
        <span class="msb-val">${selectedNights} nuit${selectedNights > 1 ? 's' : ''}</span>
      </div>
      <div class="msb-item msb-total">
        <span class="msb-label">Estimation</span>
        <span class="msb-val msb-price">${px.total_min}€ – ${px.total_max}€</span>
      </div>
    </div>

    <div class="modal-section modal-saison-section">
      <h4>Grille tarifaire annuelle (€/nuit et €/semaine)</h4>
      <div class="saison-table-wrap">
        <table class="saison-table">
          <thead><tr><th>Période</th><th>Min/nuit</th><th>Max/nuit</th><th>Sem. type</th></tr></thead>
          <tbody>${monthRows}</tbody>
        </table>
      </div>
    </div>

    <div class="modal-grid">
      <div class="modal-section">
        <h4>Note</h4>
        <div class="note-big">${c.note ? `${c.note}/5` : 'N/D'}</div>
        ${c.nb_avis ? `<p style="color:var(--color-text-muted);font-size:var(--text-sm)">${c.nb_avis} avis</p>` : ''}
      </div>
      <div class="modal-section">
        <h4>Capacité</h4>
        <p>${c.capacite}</p>
      </div>
    </div>

    <div class="modal-section">
      <h4>Hébergements</h4>
      <ul class="modal-list">${c.types_hebergement.map(t => `<li>${t}</li>`).join('')}</ul>
    </div>
    <div class="modal-section">
      <h4>Services & équipements</h4>
      <div class="service-tags">${c.services.map(s => `<span class="service-tag">${s}</span>`).join('')}</div>
    </div>
    <div class="modal-section">
      <h4>Points forts</h4>
      <ul class="modal-list">${c.points_forts.map(p => `<li>${p}</li>`).join('')}</ul>
    </div>
    ${c.plateformes ? `<div class="modal-section">
      <h4>Présence en ligne</h4>
      <div class="service-tags">${c.plateformes.map(p => `<span class="service-tag">${p}</span>`).join('')}</div>
    </div>` : ''}
    ${c.url ? `<a href="${c.url}" target="_blank" rel="noopener" class="modal-cta">Voir le site officiel →</a>` : ''}
  `;
  overlay.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.add('hidden');
  document.body.style.overflow = '';
}

document.getElementById('modal-close').addEventListener('click', closeModal);
document.getElementById('modal-overlay').addEventListener('click', e => { if(e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });

// ===== VIEW SWITCHING =====
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const v = btn.dataset.view;
    currentView = v;
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    document.querySelectorAll('.view').forEach(vEl => vEl.classList.add('hidden'));
    document.getElementById(`view-${v}`).classList.remove('hidden');
    if(v === 'grid') renderGrid();
    else if(v === 'table') renderTable();
    else if(v === 'chart') { destroyCharts(); buildCharts(); }
    else if(v === 'hebergements') renderHebergements();
  });
});

// ===== FILTER PILLS =====
document.getElementById('filter-zone').addEventListener('click', e => {
  const btn = e.target.closest('[data-zone]');
  if(!btn) return;
  activeZone = btn.dataset.zone;
  document.querySelectorAll('#filter-zone .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  refresh();
});

document.getElementById('filter-stars').addEventListener('click', e => {
  const btn = e.target.closest('[data-stars]');
  if(!btn) return;
  activeStars = btn.dataset.stars;
  document.querySelectorAll('#filter-stars .pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  refresh();
});

document.getElementById('filter-price').addEventListener('input', e => {
  maxPrice = parseInt(e.target.value);
  document.getElementById('range-display').textContent = maxPrice >= 500 ? 'Tous' : `${maxPrice}€`;
  refresh();
});

document.getElementById('search-input').addEventListener('input', e => {
  searchQuery = e.target.value.toLowerCase().trim();
  refresh();
});

// ===== TABLE SORT =====
document.querySelectorAll('.sortable').forEach(th => {
  th.addEventListener('click', () => {
    const col = th.dataset.col;
    if(sortCol === col) sortDir *= -1;
    else { sortCol = col; sortDir = 1; }
    document.querySelectorAll('.sortable').forEach(t => t.classList.remove('sort-asc','sort-desc'));
    th.classList.add(sortDir === 1 ? 'sort-asc' : 'sort-desc');
    renderTable();
  });
});

// ===== REFRESH =====
function refresh() {
  if(currentView === 'grid') renderGrid();
  else if(currentView === 'table') renderTable();
}

// ===== HÉBERGEMENTS =====
let hebFilterCamping = 'all';
let hebFilterCap = 'all';
let hebFilterGamme = 'all';
let hebSearch = '';

function getCapNum(capStr) {
  const m = capStr.match(/(\d+)/);
  return m ? parseInt(m[1]) : 0;
}

function buildHebCampingSelect() {
  const sel = document.getElementById('heb-select-camping');
  sel.innerHTML = '<option value="all">Tous les campings</option>';
  CAMPINGS.forEach(c => {
    if (!HEBERGEMENTS[c.id] || !HEBERGEMENTS[c.id].length) return;
    const opt = document.createElement('option');
    opt.value = c.id;
    opt.textContent = c.nom + (c.is_target ? ' ★ Votre camping' : '');
    sel.appendChild(opt);
  });
}

function renderHebergements() {
  buildHebCampingSelect();
  applyHebFilters();
}

function applyHebFilters() {
  const grid = document.getElementById('heb-grid');
  grid.innerHTML = '';
  let count = 0;

  // Build flat list: { camping, heb }
  const items = [];
  CAMPINGS.forEach(c => {
    const hebs = HEBERGEMENTS[c.id] || [];
    hebs.forEach(h => items.push({ camping: c, heb: h }));
  });

  // Filters
  const filtered = items.filter(({ camping, heb }) => {
    if (hebFilterCamping !== 'all' && String(camping.id) !== String(hebFilterCamping)) return false;
    if (hebFilterGamme === 'premium' && !heb.premium) return false;
    if (hebFilterGamme === 'standard' && heb.premium) return false;
    if (hebFilterCap !== 'all') {
      const cap = getCapNum(heb.capacite);
      if (hebFilterCap === '2' && cap > 2) return false;
      if (hebFilterCap === '4' && (cap < 3 || cap > 5)) return false;
      if (hebFilterCap === '6' && cap < 6) return false;
    }
    if (hebSearch) {
      const haystack = (heb.nom + ' ' + heb.equipements + ' ' + heb.surface + ' ' + heb.capacite).toLowerCase();
      if (!haystack.includes(hebSearch)) return false;
    }
    return true;
  });

  count = filtered.length;
  document.getElementById('heb-count').textContent = `${count} hébergement${count > 1 ? 's' : ''} trouvé${count > 1 ? 's' : ''}`;

  filtered.forEach(({ camping, heb }) => {
    const card = buildHebCard(camping, heb);
    grid.appendChild(card);
  });
}

function buildHebCard(camping, heb) {
  const div = document.createElement('div');
  div.className = 'heb-card' + (camping.is_target ? ' heb-card--target' : '') + (heb.premium ? ' heb-card--premium' : '');

  // Parse equipements into tags
  const equips = heb.equipements.split(/[,;]+/).map(e => e.trim()).filter(Boolean);
  const importantEquips = equips.slice(0, 6); // show up to 6 tags

  // Icon mapping
  const iconMap = {
    'clim': '❄️', 'climatisation': '❄️', 'air conditioning': '❄️', 'AC': '❄️',
    'jacuzzi': '🛁', 'spa': '🛁', 'bain nordique': '🛁', 'hot tub': '🛁',
    'lave-vaisselle': '🍽️', 'dishwasher': '🍽️',
    'tv': '📺', 'télévision': '📺', 'television': '📺',
    'wifi': '📶',
    'terrasse': '🌿', 'terrace': '🌿',
    'plancha': '🔥', 'barbecue': '🔥',
    'linge': '🛏️', 'bed linen': '🛏️', 'draps': '🛏️', 'lits faits': '🛏️',
    'ménage': '🧹', 'cleaning': '🧹',
    'piscine': '🏊', 'pool': '🏊',
    'nespresso': '☕', 'cafetière': '☕',
    'pmr': '♿',
  };

  function getIcon(eq) {
    const eqL = eq.toLowerCase();
    for (const [key, icon] of Object.entries(iconMap)) {
      if (eqL.includes(key.toLowerCase())) return icon;
    }
    return '✓';
  }

  const tagsHtml = importantEquips.map(eq => {
    const icon = getIcon(eq);
    return `<span class="heb-equip-tag">${icon} ${eq}</span>`;
  }).join('');

  const extraCount = equips.length - importantEquips.length;

  div.innerHTML = `
    <div class="heb-card-header">
      <div class="heb-card-camping">
        ${camping.is_target ? '<span class="heb-target-badge">Votre camping</span>' : ''}
        <span class="heb-camping-name">${camping.nom}</span>
        <span class="heb-stars">${'★'.repeat(camping.etoiles)}</span>
      </div>
      ${heb.premium ? '<span class="heb-premium-badge">Premium</span>' : '<span class="heb-standard-badge">Standard</span>'}
    </div>
    <div class="heb-card-name">${heb.nom}</div>
    <div class="heb-card-specs">
      <div class="heb-spec">
        <span class="heb-spec-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
        </span>
        <span>${heb.surface}</span>
      </div>
      <div class="heb-spec">
        <span class="heb-spec-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 20v-8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8"/><path d="M4 10V6a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v4"/><circle cx="8" cy="6" r="1" fill="currentColor"/></svg>
        </span>
        <span>${heb.chambres} ch.</span>
      </div>
      <div class="heb-spec">
        <span class="heb-spec-icon">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/><path d="M16 3.13a4 4 0 0 1 0 7.75M21 21v-2a4 4 0 0 0-3-3.87"/></svg>
        </span>
        <span>${heb.capacite}</span>
      </div>
    </div>
    <div class="heb-equip-tags">${tagsHtml}${extraCount > 0 ? `<span class="heb-equip-more">+${extraCount} autres</span>` : ''}</div>
    ${heb.prix_ref && heb.prix_ref !== 'N/A' && !heb.prix_ref.includes('Non visible') && !heb.prix_ref.includes('Non spécifié') ? `<div class="heb-prix-ref"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg> ${heb.prix_ref}</div>` : ''}
  `;
  return div;
}

// Filtres hébergements — événements
document.getElementById('heb-select-camping').addEventListener('change', e => {
  hebFilterCamping = e.target.value;
  applyHebFilters();
});

document.getElementById('heb-filter-capacite').addEventListener('click', e => {
  const btn = e.target.closest('[data-cap]');
  if (!btn) return;
  hebFilterCap = btn.dataset.cap;
  document.querySelectorAll('#heb-filter-capacite .heb-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  applyHebFilters();
});

document.getElementById('heb-filter-gamme').addEventListener('click', e => {
  const btn = e.target.closest('[data-gamme]');
  if (!btn) return;
  hebFilterGamme = btn.dataset.gamme;
  document.querySelectorAll('#heb-filter-gamme .heb-pill').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  applyHebFilters();
});

document.getElementById('heb-search').addEventListener('input', e => {
  hebSearch = e.target.value.toLowerCase().trim();
  applyHebFilters();
});

// ===== INIT =====
updateDateUI();
renderGrid();
