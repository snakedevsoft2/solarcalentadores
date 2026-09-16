/* ==========================================================================
   SOLAR HOME GROUP — interacciones de la landing
   Sin dependencias. Todo degrada bien si falla el JavaScript.
   ========================================================================== */
(function () {
  'use strict';

  /* ------------------------------------------------------------------
     CONFIGURACIÓN — AJUSTAR CON DATOS VERIFICADOS DE LA EMPRESA
     ahorro: porción de la factura que deja de pagarse. La empresa
     comunica 38%; si ese número cambia, cámbialo aquí y la calculadora,
     el formulario y el pop-up se actualizan solos.
     ------------------------------------------------------------------ */
  var CONFIG = {
    ahorro: 0.38,
    anos: 20,
    telefono: '+17872421249'
  };

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var root = document.documentElement;
  var quieto = matchMedia('(prefers-reduced-motion: reduce)').matches;

  var guardar = function (k, v) { try { localStorage.setItem(k, v); } catch (e) {} };
  var leer    = function (k)    { try { return localStorage.getItem(k); } catch (e) { return null; } };

  /* ==================================================================
     ANALÍTICA
     Envía a dataLayer (GTM) y a gtag (GA4) si existen. Si no hay ninguno,
     no hace nada y no rompe la página.
     ================================================================== */
  function track(evento, datos) {
    var carga = datos || {};
    try {
      window.dataLayer = window.dataLayer || [];
      window.dataLayer.push(Object.assign({ event: evento }, carga));
      if (typeof window.gtag === 'function') window.gtag('event', evento, carga);
    } catch (e) {}
  }

  document.addEventListener('click', function (e) {
    var el = e.target.closest && e.target.closest('[data-track]');
    if (!el) return;
    var tipo = el.getAttribute('data-track');
    track(tipo === 'whatsapp' ? 'click_whatsapp' : 'click_telefono', {
      ubicacion: el.getAttribute('data-where') || 'desconocida'
    });
  });

  /* ==================================================================
     IDIOMA
     El español está en el HTML. Al pasar a inglés se guarda una copia
     del original y se aplica el diccionario de i18n.js.
     ================================================================== */
  var DICC = window.SHG_I18N || {};
  var ES_JS = {
    'js.people1': '1 a 2 personas',
    'js.people2': '3 a 4 personas',
    'js.people3': '5 personas o más',
    'js.perMonth': '/ mes'
  };
  var idioma = root.getAttribute('data-lang') === 'en' ? 'en' : 'es';
  var alCambiarIdioma = [];

  /* Metadatos originales en español, para poder volver a ellos. */
  var TITULO_ES = document.title;
  var DESC_ES = (function () {
    var m = document.querySelector('meta[name="description"]');
    return m ? m.content : '';
  })();

  /* Texto de una clave en el idioma activo. */
  function t(clave) {
    if (idioma === 'en' && DICC[clave]) return DICC[clave];
    return ES_JS[clave] || '';
  }

  var ATRIBUTOS = [
    ['data-i18n-alt', 'alt'],
    ['data-i18n-aria-label', 'aria-label'],
    ['data-i18n-data-cap', 'data-cap']
  ];

  function guardarOriginales() {
    $$('[data-i18n]').forEach(function (el) {
      if (el._es == null) el._es = el.innerHTML;
    });
    ATRIBUTOS.forEach(function (par) {
      $$('[' + par[0] + ']').forEach(function (el) {
        if (el['_es_' + par[1]] == null) el['_es_' + par[1]] = el.getAttribute(par[1]) || '';
      });
    });
  }

  function aplicarIdioma(nuevo) {
    idioma = nuevo === 'en' ? 'en' : 'es';
    var ingles = idioma === 'en';

    $$('[data-i18n]').forEach(function (el) {
      var clave = el.getAttribute('data-i18n');
      el.innerHTML = ingles && DICC[clave] ? DICC[clave] : el._es;
    });

    ATRIBUTOS.forEach(function (par) {
      $$('[' + par[0] + ']').forEach(function (el) {
        var clave = el.getAttribute(par[0]);
        var valor = ingles && DICC[clave] ? DICC[clave] : el['_es_' + par[1]];
        el.setAttribute(par[1], valor);
      });
    });

    root.setAttribute('data-lang', idioma);
    root.setAttribute('lang', ingles ? 'en' : 'es-PR');

    var meta = $('meta[name="description"]');
    if (ingles && DICC._doc) {
      document.title = DICC._doc.title;
      if (meta) meta.content = DICC._doc.desc;
    } else {
      document.title = TITULO_ES;
      if (meta) meta.content = DESC_ES;
    }

    $$('[data-lang-set]').forEach(function (b) {
      var activo = b.getAttribute('data-lang-set') === idioma;
      b.classList.toggle('is-on', activo);
      b.setAttribute('aria-pressed', activo ? 'true' : 'false');
    });

    guardar('shg-lang', idioma);
    alCambiarIdioma.forEach(function (fn) { fn(); });
  }

  guardarOriginales();
  if (idioma === 'en') aplicarIdioma('en');

  $$('[data-lang-set]').forEach(function (b) {
    b.addEventListener('click', function () {
      var nuevo = b.getAttribute('data-lang-set');
      if (nuevo === idioma) return;
      aplicarIdioma(nuevo);
      track('cambio_idioma', { idioma: nuevo });
    });
  });

  /* ==================================================================
     TEMA CLARO / OSCURO
     ================================================================== */
  var btnTema = $('#themeBtn');
  if (btnTema) {
    var pintarTema = function () {
      var oscuro = root.getAttribute('data-theme') === 'dark';
      btnTema.setAttribute('aria-pressed', oscuro ? 'true' : 'false');
      var meta = $('meta[name="theme-color"]');
      if (meta) meta.content = oscuro ? '#0B1A28' : '#0D2B45';
    };
    pintarTema();

    btnTema.addEventListener('click', function () {
      var nuevo = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', nuevo);
      guardar('shg-theme', nuevo);
      pintarTema();
      track('cambio_tema', { tema: nuevo });
    });
  }

  /* ==================================================================
     HEADER: sombra al hacer scroll + menú de móvil
     ================================================================== */
  var hdr = $('#hdr');
  var menuAbierto = false;

  if (hdr) {
    var tic = false;
    var pintarHeader = function () {
      var y = window.scrollY;
      hdr.classList.toggle('is-solid', y > 56 || menuAbierto);

      var recorrible = document.documentElement.scrollHeight - window.innerHeight;
      var avance = recorrible > 0 ? Math.min(y / recorrible, 1) : 0;
      hdr.style.setProperty('--progress', (avance * 100).toFixed(2) + '%');
      tic = false;
    };
    var alHacerScroll = function () {
      if (tic) return;
      tic = true;
      requestAnimationFrame(pintarHeader);
    };
    window.addEventListener('scroll', alHacerScroll, { passive: true });
    window.addEventListener('resize', alHacerScroll, { passive: true });
    pintarHeader();
  }

  var burger = $('#burger');
  var nav = $('#nav');
  if (burger && nav) {
    var abrirMenu = function (abierto) {
      menuAbierto = abierto;
      burger.setAttribute('aria-expanded', abierto ? 'true' : 'false');
      nav.classList.toggle('is-open', abierto);
      if (hdr) hdr.classList.toggle('is-solid', abierto || window.scrollY > 56);
    };
    burger.addEventListener('click', function () {
      abrirMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') abrirMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') abrirMenu(false);
    });
  }

  /* ==================================================================
     ENTRADA SUAVE AL HACER SCROLL
     ================================================================== */
  var revelables = $$([
    '.sec-head', '.card', '.calc', '.benefits li', '.split-copy', '.split-media',
    '.table-scroll', '.flow-item', '.tl-step', '.shot', '.finance-in > *',
    '.cta-copy', '.cta-form-wrap', '.certs-in'
  ].join(','));

  if (quieto || !('IntersectionObserver' in window)) {
    revelables.forEach(function (el) { el.classList.add('is-in'); });
  } else {
    revelables.forEach(function (el) { el.classList.add('reveal'); });
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        obs.unobserve(e.target);
      });
    }, { threshold: .1, rootMargin: '0px 0px -48px 0px' });
    revelables.forEach(function (el) { obs.observe(el); });
  }

  /* ==================================================================
     FORMATO DE DINERO Y CONTADOR ANIMADO
     ================================================================== */
  function dinero(n) { return '$' + Math.round(n).toLocaleString('en-US'); }

  function contarHasta(el, hasta, ms) {
    var desde = typeof el._v === 'number' ? el._v : hasta;
    if (quieto || desde === hasta) {
      el.textContent = dinero(hasta);
      el._v = hasta;
      return;
    }
    if (el._raf) cancelAnimationFrame(el._raf);
    var t0 = null;
    var paso = function (ahora) {
      if (t0 === null) t0 = ahora;
      var p = Math.min((ahora - t0) / ms, 1);
      var e = 1 - Math.pow(1 - p, 3);              // easeOutCubic
      el.textContent = dinero(desde + (hasta - desde) * e);
      if (p < 1) el._raf = requestAnimationFrame(paso);
      else el._v = hasta;
    };
    el._raf = requestAnimationFrame(paso);
  }

  /* ==================================================================
     CALCULADORA DE AHORRO
     ================================================================== */
  var slider = $('#factura');
  var campo  = $('#facturaNum');
  var salida = $('#facturaOut');
  var resMes = $('#resMes'), resAno = $('#resAno'), res20 = $('#res20');

  function calcular(factura, animar) {
    var mes = factura * CONFIG.ahorro;
    if (salida) salida.textContent = Math.round(factura).toLocaleString('en-US');
    [[resMes, mes], [resAno, mes * 12], [res20, mes * 12 * CONFIG.anos]].forEach(function (par) {
      if (!par[0]) return;
      if (animar) contarHasta(par[0], par[1], 420);
      else { par[0].textContent = dinero(par[1]); par[0]._v = par[1]; }
    });
  }

  if (slider && campo) {
    var min = Number(slider.min), max = Number(slider.max);
    var acotar = function (v) {
      if (isNaN(v)) return Number(slider.value);
      return Math.min(max, Math.max(min, v));
    };

    slider.addEventListener('input', function () {
      campo.value = slider.value;
      calcular(Number(slider.value), true);
    });

    campo.addEventListener('input', function () {
      var v = Number(campo.value);
      if (campo.value === '' || isNaN(v)) return;
      slider.value = acotar(v);
      calcular(acotar(v), true);
    });

    campo.addEventListener('blur', function () {
      var v = acotar(Number(campo.value));
      campo.value = v; slider.value = v;
      calcular(v, true);
    });

    calcular(Number(slider.value), false);

    /* Los contadores arrancan cuando la sección entra en pantalla. */
    var seccion = $('#ahorro');
    if (seccion && !quieto && 'IntersectionObserver' in window) {
      var obsCalc = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (!e.isIntersecting) return;
          [resMes, resAno, res20].forEach(function (el) { if (el) el._v = 0; });
          calcular(Number(slider.value), true);
          obsCalc.disconnect();
        });
      }, { threshold: .35 });
      obsCalc.observe(seccion);
    }
  }

  /* ==================================================================
     GALERÍA CON LIGHTBOX
     ================================================================== */
  var lb = $('#lightbox');
  if (lb) {
    var botones = $$('.shot-b');
    var lbImg = $('#lbImg'), lbCap = $('#lbCap');
    var indice = 0, ultimoFoco = null;

    var pintarFoto = function (i) {
      indice = (i + botones.length) % botones.length;
      var b = botones[indice];
      lbImg.src = b.getAttribute('data-full');
      lbImg.alt = b.querySelector('img').alt;
      lbCap.textContent = b.getAttribute('data-cap') || '';
    };

    var abrirLb = function (i) {
      ultimoFoco = document.activeElement;
      pintarFoto(i);
      lb.hidden = false;
      document.body.style.overflow = 'hidden';
      $('#lbClose').focus();
    };

    var cerrarLb = function () {
      lb.hidden = true;
      document.body.style.overflow = '';
      if (ultimoFoco) ultimoFoco.focus();
    };

    botones.forEach(function (b, i) {
      b.addEventListener('click', function () { abrirLb(i); });
    });
    $('#lbClose').addEventListener('click', cerrarLb);
    $('#lbPrev').addEventListener('click', function () { pintarFoto(indice - 1); });
    $('#lbNext').addEventListener('click', function () { pintarFoto(indice + 1); });
    lb.addEventListener('click', function (e) { if (e.target === lb) cerrarLb(); });

    document.addEventListener('keydown', function (e) {
      if (lb.hidden) return;
      if (e.key === 'Escape') cerrarLb();
      if (e.key === 'ArrowLeft') pintarFoto(indice - 1);
      if (e.key === 'ArrowRight') pintarFoto(indice + 1);
    });
  }

  /* ==================================================================
     FORMULARIO DINÁMICO EN 3 PASOS
     ================================================================== */
  var form = $('#leadForm');
  var listo = $('#formOk');

  if (form && listo) {
    var pasos   = $$('.lead-step', form);
    var barra   = $('#stepBar');
    var numPaso = $('#stepNow');
    var actual  = 1;

    var fNombre = $('#f-nombre'), fCorreo = $('#f-correo'), fTel = $('#f-tel');
    var fPueblo = $('#f-pueblo');
    var fFactura = $('#f-factura'), billVal = $('#billVal'), estMes = $('#estMes');

    var REGLAS = [
      { campo: fNombre, error: $('#e-nombre'), paso: 2,
        ok: function (v) { return v.trim().split(/\s+/).length >= 2 && v.trim().length >= 5; } },
      { campo: fCorreo, error: $('#e-correo'), paso: 2,
        ok: function (v) { return /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(v.trim()); } },
      { campo: fTel,    error: $('#e-tel'),    paso: 2,
        ok: function (v) { return v.replace(/\D/g, '').length >= 10; } },
      { campo: fPueblo, error: $('#e-pueblo'), paso: 3,
        ok: function (v) { return v.trim().length >= 3; } }
    ];

    /* Valida solo los campos del paso indicado. */
    var revisarPaso = function (n) {
      var falla = null;
      REGLAS.forEach(function (r) {
        if (r.paso !== n) return;
        r.visto = true;
        if (!revisar(r) && !falla) falla = r.campo;
      });
      return falla;
    };

    var revisar = function (r) {
      if (!r.campo || !r.error) return true;
      var valido = r.ok(r.campo.value);
      r.campo.classList.toggle('invalid', !valido);
      r.campo.setAttribute('aria-invalid', valido ? 'false' : 'true');
      r.error.hidden = valido;
      return valido;
    };

    REGLAS.forEach(function (r) {
      if (!r.campo) return;
      r.campo.addEventListener('blur',  function () { r.visto = true; revisar(r); });
      r.campo.addEventListener('input', function () { if (r.visto) revisar(r); });
    });

    /* Paso 1: estimado en vivo mientras se mueve la barra. */
    var refrescarEstimado = function (animar) {
      if (!fFactura) return;
      var v = Number(fFactura.value);
      if (billVal) billVal.textContent = v.toLocaleString('en-US');
      if (estMes) {
        if (animar) contarHasta(estMes, v * CONFIG.ahorro, 320);
        else { estMes.textContent = dinero(v * CONFIG.ahorro); estMes._v = v * CONFIG.ahorro; }
      }
    };
    if (fFactura) {
      fFactura.addEventListener('input', function () { refrescarEstimado(true); });
      refrescarEstimado(false);
    }

    var personasElegidas = function () {
      var r = form.querySelector('input[name="personas"]:checked');
      return r ? r.value : '3-4';
    };
    var etiquetaPersonas = function () {
      var v = personasElegidas();
      var clave = v === '1-2' ? 'js.people1' : v === '5+' ? 'js.people3' : 'js.people2';
      return t(clave);
    };

    var llenarResumen = function () {
      var poner = function (id, txt) { var el = $(id); if (el) el.textContent = txt || '—'; };
      var f = fFactura ? Number(fFactura.value) : 0;
      poner('#rFactura', dinero(f) + ' ' + t('js.perMonth'));
      poner('#rModelo', etiquetaPersonas());
      poner('#rAhorro', dinero(f * CONFIG.ahorro) + ' ' + t('js.perMonth'));
    };

    var irA = function (n, avisar) {
      actual = n;
      pasos.forEach(function (p) {
        p.classList.toggle('is-on', Number(p.getAttribute('data-step')) === n);
      });
      if (barra) barra.style.width = (n / pasos.length * 100) + '%';
      if (numPaso) numPaso.textContent = n;
      if (n === 3) llenarResumen();

      if (avisar) {
        var visible = pasos.filter(function (p) { return p.classList.contains('is-on'); })[0];
        var primero = visible && visible.querySelector('input:not([type="hidden"]), button');
        if (primero && n !== 1) primero.focus({ preventScroll: true });
      }
      track('paso_formulario', { paso: n });
    };

    $$('.btn-next', form).forEach(function (b) {
      b.addEventListener('click', function () {
        var destino = Number(b.getAttribute('data-next'));
        var falla = revisarPaso(destino - 1);
        if (falla) { falla.focus(); return; }
        irA(destino, true);
      });
    });

    $$('.btn-back', form).forEach(function (b) {
      b.addEventListener('click', function () { irA(Number(b.getAttribute('data-back')), true); });
    });

    /* Los CTA de la tabla de modelos preseleccionan el tamaño de hogar. */
    $$('[data-quote]').forEach(function (a) {
      a.addEventListener('click', function () {
        var v = a.getAttribute('data-quote');
        var radio = form.querySelector('input[name="personas"][value="' + v + '"]');
        if (radio) radio.checked = true;
        irA(1, false);
      });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();

      var falla = null;
      REGLAS.forEach(function (r) {
        r.visto = true;
        if (!revisar(r) && !falla) falla = r;
      });
      if (falla) { irA(falla.paso, true); falla.campo.focus(); return; }

      /* ------------------------------------------------------------
         [ ] PENDIENTE: conectar el envío real del lead.
         Aquí va el fetch() al backend, Formspree, Netlify Forms o el
         CRM de la empresa. Hoy solo muestra la confirmación.
         ------------------------------------------------------------ */
      track('generate_lead', {
        pueblo: fPueblo ? fPueblo.value.trim() : '',
        correo: fCorreo ? fCorreo.value.trim() : '',
        factura: fFactura ? Number(fFactura.value) : null,
        personas: personasElegidas(),
        origen: 'formulario'
      });

      form.hidden = true;
      listo.hidden = false;
      listo.focus();
      guardar('shg-lead', '1');
    });

    alCambiarIdioma.push(function () { refrescarEstimado(false); if (actual === 3) llenarResumen(); });
    irA(1, false);
  }

  /* ==================================================================
     POP-UP DE CAPTACIÓN
     Aparece una sola vez: al intentar salir en escritorio, o tras leer
     buena parte de la página en móvil. Nunca si ya se envió el formulario.
     ================================================================== */
  var pop = $('#pop');
  if (pop && !leer('shg-pop') && !leer('shg-lead')) {
    var popForm = $('#popForm'), popTel = $('#pop-tel'), popErr = $('#pop-err'),
        popOk = $('#popOk'), popNum = $('#popNum');
    var mostrado = false, focoPrevio = null;

    var cerrarPop = function (motivo) {
      pop.hidden = true;
      document.body.style.overflow = '';
      guardar('shg-pop', '1');
      if (focoPrevio) focoPrevio.focus();
      if (motivo) track('cierra_popup', { motivo: motivo });
    };

    var abrirPop = function (disparo) {
      if (mostrado || leer('shg-lead')) return;
      mostrado = true;
      focoPrevio = document.activeElement;
      pop.hidden = false;
      document.body.style.overflow = 'hidden';
      $('#popX').focus();
      track('ve_popup', { disparo: disparo });

      /* El 38% cuenta hacia arriba una sola vez. */
      if (!quieto && popNum) {
        var fin = CONFIG.ahorro * 100, t0 = null;
        var sube = function (ahora) {
          if (t0 === null) t0 = ahora;
          var p = Math.min((ahora - t0) / 700, 1);
          popNum.textContent = Math.round(fin * (1 - Math.pow(1 - p, 3)));
          if (p < 1) requestAnimationFrame(sube);
        };
        requestAnimationFrame(sube);
      }
    };

    /* Escritorio: intención de salida. Móvil: profundidad de lectura. */
    var táctil = matchMedia('(hover: none)').matches;
    if (táctil) {
      var desde = Date.now();
      var porScroll = function () {
        var y = window.scrollY + window.innerHeight;
        var alto = document.documentElement.scrollHeight;
        if (y / alto > .55 && Date.now() - desde > 25000) {
          abrirPop('scroll');
          window.removeEventListener('scroll', porScroll);
        }
      };
      window.addEventListener('scroll', porScroll, { passive: true });
    } else {
      setTimeout(function () {
        document.addEventListener('mouseout', function salida(e) {
          if (e.clientY > 0 || e.relatedTarget) return;
          abrirPop('intencion_salida');
          document.removeEventListener('mouseout', salida);
        });
      }, 8000);
    }

    $('#popX').addEventListener('click', function () { cerrarPop('boton_cerrar'); });
    $('#popNo').addEventListener('click', function () { cerrarPop('ahora_no'); });
    pop.addEventListener('click', function (e) { if (e.target === pop) cerrarPop('fondo'); });
    document.addEventListener('keydown', function (e) {
      if (!pop.hidden && e.key === 'Escape') cerrarPop('escape');
    });

    if (popForm) {
      popForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var valido = popTel.value.replace(/\D/g, '').length >= 10;
        popErr.hidden = valido;
        popTel.classList.toggle('invalid', !valido);
        popTel.setAttribute('aria-invalid', valido ? 'false' : 'true');
        if (!valido) { popTel.focus(); return; }

        /* [ ] PENDIENTE: enviar este teléfono al mismo destino que el
           formulario principal. */
        track('generate_lead', { origen: 'popup' });
        popForm.hidden = true;
        popOk.hidden = false;
        guardar('shg-lead', '1');
        setTimeout(function () { cerrarPop(); }, 2600);
      });
    }
  }

  /* ==================================================================
     VIDEO DEL HERO
     Se reproduce solo, sin sonido. Se retira si el usuario pidió menos
     movimiento o si viaja con ahorro de datos.
     ================================================================== */
  var heroVid = $('#heroVideo');
  if (heroVid) {
    var con = navigator.connection;
    var lenta = con && (con.saveData || /2g/.test(con.effectiveType || ''));

    if (quieto || lenta) {
      heroVid.removeAttribute('autoplay');
      heroVid.pause();
      heroVid.removeAttribute('src');
      heroVid.load();
    } else {
      var arranque = heroVid.play();
      if (arranque && arranque.catch) arranque.catch(function () {});

      /* No gasta batería cuando el hero queda fuera de pantalla. */
      if ('IntersectionObserver' in window) {
        var obsHero = new IntersectionObserver(function (entradas) {
          entradas.forEach(function (e) {
            if (e.isIntersecting) { var p = heroVid.play(); if (p && p.catch) p.catch(function () {}); }
            else heroVid.pause();
          });
        }, { threshold: .05 });
        obsHero.observe(heroVid);
      }
    }
  }

  /* ==================================================================
     VIDEO DE LA INSTALACIÓN
     Arranca solo y sin sonido al entrar en pantalla; se pausa al salir.
     ================================================================== */
  var tour = $('#tourVideo');
  var btnPlay = $('#vidPlay');
  var marco = tour ? tour.closest('.vid-frame') : null;

  if (tour && btnPlay && marco) {
    var reproducirTour = function () {
      var p = tour.play();
      if (p && p.catch) p.catch(function () { marco.classList.remove('is-playing'); });
    };

    btnPlay.addEventListener('click', function () {
      if (tour.paused) { reproducirTour(); track('reproduce_video', { video: 'instalacion' }); }
      else { tour.pause(); }
    });

    tour.addEventListener('play', function () {
      marco.classList.add('is-playing');
      btnPlay.setAttribute('aria-pressed', 'true');
      btnPlay.setAttribute('aria-label', t('a11y.pause') || 'Pausar el video');
    });
    tour.addEventListener('pause', function () {
      marco.classList.remove('is-playing');
      btnPlay.setAttribute('aria-pressed', 'false');
      btnPlay.setAttribute('aria-label', t('a11y.play') || 'Reproducir el video');
    });

    if (quieto) {
      tour.removeAttribute('autoplay');
      tour.pause();
    } else if ('IntersectionObserver' in window) {
      var obsVid = new IntersectionObserver(function (entradas) {
        entradas.forEach(function (e) {
          if (e.isIntersecting) reproducirTour();
          else tour.pause();
        });
      }, { threshold: .4 });
      obsVid.observe(tour);
    }
  }

  /* ==================================================================
     CONTROLES DEL VIDEO DE INSTALACIÓN
     ================================================================== */
  var btnSound = $('#vidSound');
  if (btnSound && tour) {
    btnSound.addEventListener('click', function () {
      tour.muted = !tour.muted;
      marco.classList.toggle('has-sound', !tour.muted);
      btnSound.setAttribute('aria-pressed', tour.muted ? 'false' : 'true');
      btnSound.setAttribute('aria-label', t(tour.muted ? 'a11y.sound' : 'a11y.muted') ||
        (tour.muted ? 'Activar el sonido' : 'Silenciar el video'));
    });
  }

  /* ==================================================================
     GLOBO DEL TÉCNICO DE WHATSAPP
     Se asoma una vez, poco después de llegar, y se retira solo.
     ================================================================== */
  var tip = $('#waTip');
  if (tip && !quieto) {
    setTimeout(function () {
      tip.classList.add('is-on');
      setTimeout(function () { tip.classList.remove('is-on'); }, 5200);
    }, 6000);
  }

  /* ==================================================================
     Año del footer
     ================================================================== */
  var ano = $('#year');
  if (ano) ano.textContent = new Date().getFullYear();

})();
