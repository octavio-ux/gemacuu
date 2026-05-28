/**
 * GEMA Portal - Evento Patch
 * Adds: Copiar Link button, Padrino progress, Dashboard enhancements
 * Load this AFTER the main index.html script
 */
(function() {
  'use strict';
  
  const BASE_URL = window.location.origin;
  const SPONSORS = ['Fernando Amezcua', 'Martin Yáñez', 'Rene Espinoza'];

  // Wait for DOM and Supabase
  function init() {
    addCopiarLinkToActividades();
    addPadrinoWidget();
  }

  // Add "Copiar Link" button to activity cards with tipo "evento"
  function addCopiarLinkToActividades() {
    // Watch for activity list rendering
    const observer = new MutationObserver(() => {
      document.querySelectorAll('[data-tipo="evento"], .act-card').forEach(card => {
        if (card.querySelector('.copiar-link-btn')) return;
        const nombre = card.getAttribute('data-nombre') || card.querySelector('.act-nombre')?.textContent?.trim();
        if (!nombre) return;
        
        const tipo = card.getAttribute('data-tipo') || card.querySelector('.act-tipo')?.textContent?.trim();
        if (tipo && tipo.toLowerCase() !== 'evento') return;

        const btn = document.createElement('button');
        btn.className = 'copiar-link-btn';
        btn.innerHTML = '🔗 Copiar Link';
        btn.style.cssText = 'margin-top:8px;padding:6px 12px;background:#1f6feb;color:#fff;border:none;border-radius:4px;font-size:12px;cursor:pointer;';
        btn.onclick = (e) => {
          e.stopPropagation();
          const link = `${BASE_URL}/registro.html?actividad=${encodeURIComponent(nombre)}`;
          navigator.clipboard.writeText(link).then(() => {
            btn.innerHTML = '✅ Link copiado';
            setTimeout(() => { btn.innerHTML = '🔗 Copiar Link'; }, 2000);
          });
        };
        card.appendChild(btn);
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Also add to "actividades recientes" section
    setTimeout(() => {
      const actSection = document.getElementById('dash-actividades');
      if (actSection) {
        actSection.querySelectorAll('tr, .activity-item').forEach(row => {
          const tipoCell = row.cells?.[1] || row.querySelector('.tipo');
          if (tipoCell && tipoCell.textContent.toLowerCase().includes('evento')) {
            if (row.querySelector('.copiar-link-btn')) return;
            const nombre = row.cells?.[0]?.textContent?.trim() || row.querySelector('.nombre')?.textContent?.trim();
            if (!nombre) return;
            const btn = document.createElement('button');
            btn.className = 'copiar-link-btn';
            btn.innerHTML = '🔗';
            btn.title = 'Copiar link de micrositio';
            btn.style.cssText = 'padding:4px 8px;background:#1f6feb;color:#fff;border:none;border-radius:3px;font-size:11px;cursor:pointer;margin-left:8px;';
            btn.onclick = (e) => {
              e.stopPropagation();
              const link = `${BASE_URL}/registro.html?actividad=${encodeURIComponent(nombre)}`;
              navigator.clipboard.writeText(link).then(() => {
                btn.innerHTML = '✅';
                showToast('Link copiado: ' + link);
                setTimeout(() => { btn.innerHTML = '🔗'; }, 2000);
              });
            };
            (row.cells?.[row.cells.length-1] || row).appendChild(btn);
          }
        });
      }
    }, 2000);
  }

  // Add Padrino progress widget to dashboard
  async function addPadrinoWidget() {
    try {
      // Get registrations
      const { data: registrations } = await window.supabase.createClient(
        'https://hhqauklluvlfqbweipxa.supabase.co',
        'sb_publishable_2p9bArBsYLD3GG_seT6E7w_C7DSdwsP'
      ).from('event_registrations').select('padrino');

      const { data: personnel } = await window.supabase.createClient(
        'https://hhqauklluvlfqbweipxa.supabase.co',
        'sb_publishable_2p9bArBsYLD3GG_seT6E7w_C7DSdwsP'
      ).from('personnel_list').select('padrino');

      if (!personnel || personnel.length === 0) return;

      // Count by sponsor
      const totals = {};
      const registered = {};
      SPONSORS.forEach(s => { totals[s] = 0; registered[s] = 0; });
      personnel.forEach(p => { if (totals[p.padrino] !== undefined) totals[p.padrino]++; });
      if (registrations) {
        registrations.forEach(r => { if (registered[r.padrino] !== undefined) registered[r.padrino]++; });
      }

      // Inject widget into dashboard
      const dashTotales = document.getElementById('dash-totales-list') || document.getElementById('dash-totales');
      if (dashTotales) {
        const widget = document.createElement('div');
        widget.style.cssText = 'margin-top:16px;padding:12px;background:rgba(35,134,54,0.1);border:1px solid rgba(35,134,54,0.3);border-radius:8px;';
        widget.innerHTML = `<div style="font-weight:600;margin-bottom:8px;color:#3fb950">📊 Registrados por Padrino</div>` +
          SPONSORS.map(s => `<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:13px"><span>${s}</span><span style="font-weight:600">${registered[s]||0} / ${totals[s]||0}</span></div>`).join('');
        dashTotales.appendChild(widget);
      }
    } catch(e) { console.log('Padrino widget error:', e); }
  }

  // Toast notification
  function showToast(msg) {
    const toast = document.createElement('div');
    toast.textContent = msg;
    toast.style.cssText = 'position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#238636;color:#fff;padding:12px 24px;border-radius:8px;font-size:14px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,0.3);';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // Run when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    setTimeout(init, 1000);
  }
})();