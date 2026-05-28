// ══════ GEMACUU PATCH v2 — Runtime enhancements ══════
// Adds: Copiar Enlace for eventos, Dashboard evento metrics
// Auto-loads after main script via <script> tag

(function(){
'use strict';

const FORM_BASE_URL = 'https://gema-form-30mayo.preview.emergentagent.com';
const TOTAL_PERSONAL = 164;

// === Copiar Enlace ===
window.copiarEnlaceEvento = function(nombre) {
  const link = FORM_BASE_URL + '?actividad=' + encodeURIComponent(nombre);
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(link).then(function(){
      toast('✓ Enlace copiado: ' + link);
    }).catch(function(){ _fallbackCopy(link); });
  } else { _fallbackCopy(link); }
};

function _fallbackCopy(text) {
  var ta = document.createElement('textarea');
  ta.value = text; ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta);
  toast('✓ Enlace copiado');
}

// === Evento Dashboard Widget ===
window.renderEventoDashboard = async function() {
  try {
    if (!window.sb || !window.currentUser) return;
    const sb = window.sb;
    // Get most recent active evento
    const {data: eventos} = await sb.from('actividades').select('id,nombre').eq('tipo','evento').order('fecha',{ascending:false}).limit(1);
    if (!eventos || !eventos.length) return;
    const eventoActivo = eventos[0];

    // Get all personnel with padrino info
    const {data: personal} = await sb.from('personal').select('nombre,padrino');
    if (!personal) return;

    // Get registrations
    let registrados = [];
    const {data: regs, error: regErr} = await sb.from('event_registrations').select('nombre,padrino,actividad');
    if (!regErr && regs) {
      registrados = regs.filter(function(r){ return !r.actividad || r.actividad === eventoActivo.nombre; });
    } else {
      const {data: regs2} = await sb.from('registros_evento').select('nombre,padrino,actividad');
      if (regs2) registrados = regs2.filter(function(r){ return !r.actividad || r.actividad === eventoActivo.nombre; });
    }

    const totalOperando = registrados.length;
    const avance = totalOperando + ' / ' + TOTAL_PERSONAL;
    const pctAvance = Math.round((totalOperando / TOTAL_PERSONAL) * 100);

    // Pendientes por padrino
    const nombresReg = new Set(registrados.map(function(r){ return (r.nombre||'').toLowerCase().trim(); }));
    const padrinoMap = {
      'fernando': {label:'Fernando Amezcua', pending:[]},
      'martin': {label:'Martin Yáñez', pending:[]},
      'rene': {label:'Rene Espinoza', pending:[]}
    };
    personal.forEach(function(p){
      var n = (p.nombre||'').toLowerCase().trim();
      if (!nombresReg.has(n) && padrinoMap[p.padrino]) {
        padrinoMap[p.padrino].pending.push(p.nombre);
      }
    });

    // Inject widget after dash-stats
    var container = document.getElementById('dash-stats');
    if (!container) return;
    var existing = document.getElementById('evento-dashboard-widget');
    if (existing) existing.remove();

    var widget = document.createElement('div');
    widget.id = 'evento-dashboard-widget';
    widget.style.cssText = 'grid-column:1/-1;margin-top:4px';
    widget.innerHTML = '<div class="card" style="border:1px solid rgba(31,111,235,.3);margin-bottom:14px">' +
      '<div class="card-title" style="color:var(--blue2)">🎪 Evento Activo: ' + eventoActivo.nombre + '</div>' +
      '<div class="grid3 mb-3" style="gap:10px">' +
        '<div class="stat" style="border-color:rgba(63,185,80,.3)"><div class="stat-label">TOTAL OPERANDO</div><div class="stat-val" style="color:var(--accent2)">' + totalOperando + '</div></div>' +
        '<div class="stat" style="border-color:rgba(88,166,255,.3)"><div class="stat-label">AVANCE ACTIVIDAD</div><div class="stat-val" style="color:var(--blue2)">' + avance + '</div><div class="text-xs text-muted mt-2">' + pctAvance + '% del padrón</div></div>' +
        '<div class="stat" style="border-color:rgba(210,153,34,.3)"><div class="stat-label">PENDIENTES TOTAL</div><div class="stat-val" style="color:var(--yellow)">' + (TOTAL_PERSONAL - totalOperando) + '</div></div>' +
      '</div>' +
      '<div class="card-title" style="font-size:12px">📋 Pendientes por Padrino</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">' +
        Object.values(padrinoMap).map(function(pad){
          return '<div style="background:var(--bg3);border-radius:8px;padding:10px;border:1px solid var(--border)">' +
            '<div style="font-size:12px;font-weight:600;color:var(--text);margin-bottom:6px">' + pad.label + ' <span class="badge badge-yellow" style="margin-left:4px">' + pad.pending.length + '</span></div>' +
            '<div style="max-height:120px;overflow-y:auto;font-size:11px;color:var(--muted);line-height:1.6">' +
              (pad.pending.length ? pad.pending.slice(0,20).map(function(n){return '• '+n;}).join('<br>') + (pad.pending.length>20?'<br><span style="color:var(--yellow)">... y '+(pad.pending.length-20)+' más</span>':'') : '<span style="color:var(--accent2)">✓ todos registrados</span>') +
            '</div></div>';
        }).join('') +
      '</div>' +
      '<div class="flex gap-2 mt-3">' +
        '<button class="btn btn-sm" style="background:#1f6feb;color:#fff" onclick="copiarEnlaceEvento(\'' + eventoActivo.nombre.replace(/'/g,"\\'") + '\')">🔗 Copiar Enlace del Evento</button>' +
        '<span class="text-xs text-muted" style="align-self:center">enlace: ' + FORM_BASE_URL + '?actividad=' + encodeURIComponent(eventoActivo.nombre) + '</span>' +
      '</div></div>';
    container.after(widget);
  } catch(e) { console.log('Evento dashboard error:', e); }
};

// === Hook into showView for dashboard ===
var _origShowView = window.showView;
if (_origShowView) {
  window.showView = function(id) {
    _origShowView(id);
    if (id === 'dashboard') { setTimeout(renderEventoDashboard, 100); }
  };
}

// === Inject "Copiar Enlace" buttons into evento activity cards ===
var observer = new MutationObserver(function(mutations){
  mutations.forEach(function(m){
    m.addedNodes.forEach(function(node){
      if (node.nodeType === 1) {
        // Find act-cards with evento badge that don't have our button yet
        var cards = node.querySelectorAll ? node.querySelectorAll('.act-card') : [];
        cards.forEach(function(card){
          if (card.querySelector('.badge-purple') && !card.querySelector('.copiar-enlace-btn')) {
            var nombre = card.querySelector('[style*="font-weight:600"]');
            if (nombre) {
              var btn = document.createElement('button');
              btn.className = 'btn btn-sm copiar-enlace-btn';
              btn.style.cssText = 'background:#1f6feb;color:#fff;font-size:11px;white-space:nowrap;margin-left:auto';
              btn.textContent = '🔗 Copiar Enlace';
              btn.onclick = function(e){ e.stopPropagation(); copiarEnlaceEvento(nombre.textContent.trim()); };
              var flexDiv = card.querySelector('.flex');
              if (flexDiv) flexDiv.appendChild(btn);
            }
          }
        });
      }
    });
  });
});
observer.observe(document.body, {childList:true, subtree:true});

// === Hook verActividad to add Copiar Enlace in modal ===
var _origVerActividad = window.verActividad;
if (_origVerActividad) {
  window.verActividad = async function(id) {
    await _origVerActividad(id);
    // Check if it's an evento and add copy link
    var modal = document.getElementById('ver-act-body');
    if (modal && !modal.querySelector('.copiar-enlace-modal')) {
      // Check via badge in the modal content
      if (modal.innerHTML.includes('badge-purple') || modal.innerHTML.includes('evento')) {
        var titulo = document.getElementById('ver-act-titulo');
        if (titulo) {
          var div = document.createElement('div');
          div.className = 'copiar-enlace-modal';
          div.style.cssText = 'margin-top:14px;padding-top:14px;border-top:1px solid var(--border)';
          div.innerHTML = '<div class="flex gap-2 items-center">' +
            '<button class="btn btn-primary btn-sm" onclick="copiarEnlaceEvento(\'' + titulo.textContent.replace(/'/g,"\\'") + '\')">🔗 Copiar Enlace</button>' +
            '<span class="text-xs text-muted">' + FORM_BASE_URL + '?actividad=' + encodeURIComponent(titulo.textContent) + '</span></div>';
          modal.appendChild(div);
        }
      }
    }
  };
}

// If dashboard is already visible, render immediately
if (document.getElementById('view-dashboard') && !document.getElementById('view-dashboard').classList.contains('hidden')) {
  setTimeout(renderEventoDashboard, 500);
}

console.log('✓ gemacuu-patch-v2.js loaded');
})();
