/* Gallery logic: tabs, search, cards with hover playback, modal with prompts */
(function () {
  const templates = window.TEMPLATES || [];
  const categoryOrder = window.CATEGORY_ORDER || [];
  const sources = window.SOURCES || [];

  const grid = document.getElementById('grid');
  const tabsEl = document.getElementById('tabs');
  const sourcesEl = document.getElementById('sources');
  const gridInfo = document.getElementById('gridInfo');
  const searchEl = document.getElementById('search');

  const modal = document.getElementById('modal');
  const modalVideo = document.getElementById('modalVideo');
  const modalTitle = document.getElementById('modalTitle');
  const modalDesc = document.getElementById('modalDesc');
  const modalSummary = document.getElementById('modalSummary');
  const modalBadges = document.getElementById('modalBadges');
  const promptText = document.getElementById('promptText');
  const copyBtn = document.getElementById('copyBtn');
  const ptabs = Array.from(document.querySelectorAll('.ptab'));

  let activeCategory = 'All';
  let activeSource = 'all';
  let searchTerm = '';
  let currentItem = null;
  let promptMode = 'simple';

  /* ---------- tabs ---------- */
  function buildTabs() {
    const cats = ['All', ...categoryOrder];
    tabsEl.innerHTML = '';
    const pool = templates.filter(t => activeSource === 'all' || t.source === activeSource);
    cats.forEach(cat => {
      const count = cat === 'All'
        ? pool.length
        : pool.filter(t => t.categories.includes(cat)).length;
      if (cat !== 'All' && count === 0) return;
      const btn = document.createElement('button');
      btn.className = 'tab' + (cat === activeCategory ? ' active' : '');
      btn.innerHTML = `${cat}<span class="count">${count}</span>`;
      btn.addEventListener('click', () => {
        activeCategory = cat;
        buildTabs();
        render();
      });
      tabsEl.appendChild(btn);
    });
  }

  /* ---------- source filter ---------- */
  function sourceLabel(key) {
    const s = sources.find(x => x.key === key);
    return s ? s.label : key;
  }

  function buildSources() {
    if (!sourcesEl) return;
    sourcesEl.innerHTML = '';
    const opts = [{ key: 'all', label: 'כל המקורות' }, ...sources];
    opts.forEach(o => {
      const count = o.key === 'all'
        ? templates.length
        : templates.filter(t => t.source === o.key).length;
      const btn = document.createElement('button');
      btn.className = 'source-chip' + (o.key === activeSource ? ' active' : '');
      btn.innerHTML = `${o.label}<span class="count">${count}</span>`;
      btn.addEventListener('click', () => {
        activeSource = o.key;
        if (activeCategory !== 'All') {
          const pool = templates.filter(t => activeSource === 'all' || t.source === activeSource);
          const stillValid = pool.some(t => t.categories.includes(activeCategory));
          if (!stillValid) activeCategory = 'All';
        }
        buildSources();
        buildTabs();
        render();
      });
      sourcesEl.appendChild(btn);
    });
  }

  /* ---------- grid ---------- */
  function visibleItems() {
    return templates.filter(t => {
      const inCat = activeCategory === 'All' || t.categories.includes(activeCategory);
      const inSource = activeSource === 'all' || t.source === activeSource;
      const q = searchTerm.trim().toLowerCase();
      const inSearch = !q
        || t.name.toLowerCase().includes(q)
        || (t.summaryHe || '').includes(searchTerm.trim());
      return inCat && inSource && inSearch;
    });
  }

  function render() {
    const items = visibleItems();
    grid.innerHTML = '';
    gridInfo.textContent = `${items.length} תבניות`;
    items.forEach(t => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <div class="card-media">
          <img src="${t.thumb}" loading="lazy" alt="">
          ${t.free ? '<span class="badge-free">FREE</span>' : ''}
          ${t.isNew ? '<span class="badge-new">NEW</span>' : ''}
          <span class="card-source">${sourceLabel(t.source)}</span>
        </div>
        <div class="card-title">${t.name}</div>`;

      const media = card.querySelector('.card-media');
      let vid = null;
      card.addEventListener('mouseenter', () => {
        if (!vid) {
          vid = document.createElement('video');
          vid.muted = true; vid.loop = true; vid.playsInline = true;
          vid.src = t.video;
          vid.addEventListener('canplay', () => vid.classList.add('loaded'));
          media.appendChild(vid);
        }
        vid.play().catch(() => {});
      });
      card.addEventListener('mouseleave', () => { if (vid) vid.pause(); });
      card.addEventListener('click', () => openModal(t));
      grid.appendChild(card);
    });
  }

  /* ---------- modal ---------- */
  function openModal(t) {
    currentItem = t;
    promptMode = 'simple';
    ptabs.forEach(p => p.classList.toggle('active', p.dataset.mode === 'simple'));
    modalTitle.textContent = t.name;
    modalDesc.textContent = t.description || '';
    modalSummary.textContent = t.summaryHe || 'תקציר יתווסף בקרוב';
    modalBadges.innerHTML =
      (t.free ? '<span class="chip free">FREE</span>' : '') +
      `<span class="chip">${sourceLabel(t.source)}</span>` +
      t.categories.map(c => `<span class="chip">${c}</span>`).join('');
    modalVideo.muted = false;
    modalVideo.src = t.video;
    modalVideo.load();
    modalVideo.play().catch(() => {
      // Autoplay-with-sound blocked by the browser -> fall back to muted so it still plays.
      modalVideo.muted = true;
      modalVideo.play().catch(() => {});
    });
    updatePrompt();
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal.hidden = true;
    modalVideo.pause();
    modalVideo.removeAttribute('src');
    modalVideo.load();
    document.body.style.overflow = '';
  }

  function updatePrompt() {
    if (!currentItem) return;
    const txt = promptMode === 'simple'
      ? (currentItem.promptSimple || 'הפרומפט יתווסף בקרוב')
      : (currentItem.promptExtended || 'הפרומפט יתווסף בקרוב');
    promptText.textContent = txt;
    copyBtn.classList.remove('copied');
    copyBtn.textContent = 'העתקה';
  }

  ptabs.forEach(p => p.addEventListener('click', () => {
    promptMode = p.dataset.mode;
    ptabs.forEach(x => x.classList.toggle('active', x === p));
    updatePrompt();
  }));

  copyBtn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(promptText.textContent);
    } catch (e) {
      const ta = document.createElement('textarea');
      ta.value = promptText.textContent;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      ta.remove();
    }
    copyBtn.classList.add('copied');
    copyBtn.textContent = 'הועתק ✓';
  });

  function navigateModal(step) {
    if (!currentItem) return;
    const items = visibleItems();
    const idx = items.findIndex(t => t.slug === currentItem.slug);
    if (idx === -1) return;
    const nextIdx = (idx + step + items.length) % items.length;
    openModal(items[nextIdx]);
  }

  document.getElementById('modalClose').addEventListener('click', closeModal);
  modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => {
    if (modal.hidden) return;
    if (e.key === 'Escape') { closeModal(); return; }
    if (e.key === 'ArrowRight') { e.preventDefault(); navigateModal(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); navigateModal(-1); }
  });

  searchEl.addEventListener('input', () => { searchTerm = searchEl.value; render(); });

  buildSources();
  buildTabs();
  render();
})();
