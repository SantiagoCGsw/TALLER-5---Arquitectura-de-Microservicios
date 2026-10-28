"use strict";

/* ==========================================================================
   Panel de operación · Tienda Virtual
   Todo el contenido dinámico se construye con DOM + textContent (sin innerHTML).
   ========================================================================== */

const NS = "http://www.w3.org/2000/svg";

// Una sola familia de iconos (trazos tipo Lucide, 24x24, stroke 1.75)
const ICONOS = {
  plus: ["M5 12h14", "M12 5v14"],
  refresh: ["M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8", "M21 3v5h-5",
            "M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16", "M8 16H3v5"],
  package: ["m7.5 4.27 9 5.15",
            "M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z",
            "m3.3 7 8.7 5 8.7-5", "M12 22V12"],
  users: ["M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2", "M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8Z",
          "M22 21v-2a4 4 0 0 0-3-3.87", "M16 3.13a4 4 0 0 1 0 7.75"],
  receipt: ["M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z",
            "M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8", "M12 17.5v-11"],
  alerta: ["m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3", "M12 9v4", "M12 17h.01"],
  check: ["M20 6 9 17l-5-5"],
};

const $ = (selector, raiz = document) => raiz.querySelector(selector);
const $$ = (selector, raiz = document) => [...raiz.querySelectorAll(selector)];
const cop = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 });
const formatoFecha = new Intl.DateTimeFormat("es-CO", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

function icono(nombre, tam = 20) {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", tam);
  svg.setAttribute("height", tam);
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.75");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("class", "icono");
  for (const d of ICONOS[nombre]) {
    const path = document.createElementNS(NS, "path");
    path.setAttribute("d", d);
    svg.append(path);
  }
  return svg;
}

function h(etiqueta, props = {}, ...hijos) {
  const el = document.createElement(etiqueta);
  for (const [clave, valor] of Object.entries(props || {})) {
    if (clave === "class") el.className = valor;
    else if (clave.startsWith("on")) el.addEventListener(clave.slice(2), valor);
    else if (valor === true) el.setAttribute(clave, "");
    else if (valor !== false && valor != null) el.setAttribute(clave, valor);
  }
  el.append(...hijos.flat().filter((x) => x != null && x !== false));
  return el;
}

/* ---------- Comunicación con el gateway ---------- */
function mensajeError(cuerpo, estado) {
  if (cuerpo && typeof cuerpo.detail === "string") return cuerpo.detail;
  if (cuerpo && Array.isArray(cuerpo.detail)) {
    const campos = [...new Set(cuerpo.detail.map((d) => (d.loc || []).slice(-1)[0]))];
    return `Revisa estos campos: ${campos.join(", ")}.`;
  }
  return `Algo salió mal (código ${estado}).`;
}

async function api(metodo, ruta, cuerpo) {
  let respuesta;
  try {
    respuesta = await fetch(`/api/${ruta}`, {
      method: metodo,
      headers: { "Content-Type": "application/json" },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw Object.assign(new Error("No hay conexión con la aplicación. Revisa que run_all.py siga en marcha."), { status: 0 });
  }
  const json = await respuesta.json().catch(() => null);
  if (!respuesta.ok) throw Object.assign(new Error(mensajeError(json, respuesta.status)), { status: respuesta.status });
  return json;
}

/* ---------- Definición de cada sección ---------- */
const stockEtiqueta = (p) => {
  if (p.stock === 0) return h("span", { class: "pocas" }, icono("alerta", 16), "0 · Agotado");
  if (p.stock <= 5) return h("span", { class: "pocas" }, icono("alerta", 16), `${p.stock} · Pocas unidades`);
  return String(p.stock);
};

const RECURSOS = {
  productos: {
    etiqueta: "Productos", puerto: 8001,
    meta: (d) => `${d.length} referencias · ${d.reduce((s, p) => s + p.stock, 0)} unidades en stock`,
    columnas: [
      { titulo: "Id", clase: "mono", celda: (p) => p.id },
      { titulo: "Producto", clase: "fuerte", celda: (p) => p.nombre },
      { titulo: "Precio", clase: "num", celda: (p) => cop.format(p.precio) },
      { titulo: "Existencias", clase: "num", celda: stockEtiqueta },
    ],
    vacio: { icono: "package", titulo: "El catálogo está vacío",
             texto: "Registra el primer producto para poder crear pedidos.",
             dialogo: "dlg-producto", boton: "Registrar producto" },
  },
  clientes: {
    etiqueta: "Clientes", puerto: 8002,
    meta: (d) => `${d.length} ${d.length === 1 ? "cliente registrado" : "clientes registrados"}`,
    columnas: [
      { titulo: "Id", clase: "mono", celda: (c) => c.id },
      { titulo: "Nombre", clase: "fuerte", celda: (c) => c.nombre },
      { titulo: "Correo", celda: (c) => c.email },
    ],
    vacio: { icono: "users", titulo: "Aún no hay clientes",
             texto: "Registra al primer cliente para poder asociarle pedidos.",
             dialogo: "dlg-cliente", boton: "Registrar cliente" },
  },
  pedidos: {
    etiqueta: "Pedidos", puerto: 8003,
    meta: (d) => `${d.length} ${d.length === 1 ? "pedido" : "pedidos"} · ${cop.format(d.reduce((s, p) => s + p.total, 0))} vendidos`,
    columnas: [
      { titulo: "N.º", clase: "mono", celda: (p) => p.id },
      { titulo: "Cliente", clase: "fuerte", celda: (p) => p.cliente },
      { titulo: "Producto", celda: (p) => p.producto },
      { titulo: "Cant.", clase: "num", celda: (p) => p.cantidad },
      { titulo: "Total", clase: "num", celda: (p) => cop.format(p.total) },
      { titulo: "Estado", celda: () => h("span", { class: "ok-texto" }, icono("check", 16), "Creado") },
      { titulo: "Fecha", celda: (p) => formatoFecha.format(new Date(p.fecha)) },
    ],
    vacio: { icono: "receipt", titulo: "Todavía no hay pedidos",
             texto: "Cuando confirmes el primero con el formulario, aparecerá aquí con su total." },
  },
};

const ESTADO = Object.fromEntries(
  Object.keys(RECURSOS).map((r) => [r, { fase: "cargando", datos: [], error: null, nuevo: null }])
);

/* ---------- Pintado de paneles ---------- */
function pintarPanel(recurso) {
  const def = RECURSOS[recurso];
  const est = ESTADO[recurso];
  const panel = $(`#panel-${recurso}`);
  panel.replaceChildren(contenidoPanel(recurso, def, est));
}

function contenidoPanel(recurso, def, est) {
  if (est.fase === "cargando") {
    return h("div", { class: "skel", "aria-busy": "true", "aria-label": `Cargando ${def.etiqueta.toLowerCase()}` },
      [0, 1, 2, 3].map(() => h("div", { class: "skel-fila" }, h("span"), h("span"), h("span"), h("span"))));
  }
  if (est.fase === "error") {
    const detalle = est.error && !/no disponible/i.test(est.error) ? est.error
      : "Los demás servicios siguen funcionando. Volveremos a intentarlo solos en unos segundos.";
    return h("div", { class: "estado error", role: "alert" },
      icono("alerta", 24),
      h("div", {},
        h("p", { class: "estado-titulo" }, `El servicio de ${def.etiqueta} no responde`),
        h("p", { class: "estado-texto" }, detalle),
        h("button", { class: "btn secundario", type: "button", onclick: () => cargar(recurso) }, icono("refresh", 18), "Reintentar ahora")));
  }
  if (!est.datos.length) {
    const v = def.vacio;
    return h("div", { class: "estado" },
      icono(v.icono, 24),
      h("div", {},
        h("p", { class: "estado-titulo" }, v.titulo),
        h("p", { class: "estado-texto" }, v.texto),
        v.dialogo && h("button", { class: "btn primario", type: "button", "data-abrir": v.dialogo, onclick: abrirDialogo },
          icono("plus", 18), v.boton)));
  }
  const filas = est.datos.map((fila) =>
    h("tr", { class: fila.id === est.nuevo ? "nuevo" : "" },
      def.columnas.map((c) => h("td", { class: c.clase || "" }, c.celda(fila)))));
  est.nuevo = null;
  return h("div", { class: "tabla-wrap" },
    h("table", {},
      h("caption", { class: "sr-only" }, def.etiqueta),
      h("thead", {}, h("tr", {}, def.columnas.map((c) => h("th", { scope: "col", class: c.clase === "num" ? "num" : "" }, c.titulo)))),
      h("tbody", {}, filas)));
}

function pintarMeta(recurso) {
  const def = RECURSOS[recurso];
  const est = ESTADO[recurso];
  const ok = est.fase === "ok";
  $(`#meta-${recurso}`).textContent = ok ? def.meta(est.datos)
    : est.fase === "error" ? "Sin datos: el servicio no responde" : "Cargando…";
  $(`#n-${recurso}`).textContent = ok ? est.datos.length : "";
}

async function cargar(recurso, { silencioso = false } = {}) {
  const est = ESTADO[recurso];
  if (!silencioso && est.fase !== "ok") {
    est.fase = "cargando";
    pintarPanel(recurso);
  }
  try {
    est.datos = await api("GET", recurso);
    est.fase = "ok";
    est.error = null;
  } catch (error) {
    est.datos = [];
    est.fase = "error";
    est.error = error.message;
  }
  pintarPanel(recurso);
  pintarMeta(recurso);
  if (recurso !== "pedidos") sincronizarFormularioPedido();
}

/* ---------- Avisos ---------- */
let temporizadorAviso;
function aviso(texto, tipo = "ok") {
  const caja = $("#aviso");
  caja.replaceChildren(icono(tipo === "ok" ? "check" : "alerta", 18), h("span", {}, texto));
  caja.className = `ver ${tipo}`;
  clearTimeout(temporizadorAviso);
  temporizadorAviso = setTimeout(() => (caja.className = ""), 4500);
}

function mostrarError(elemento, texto) {
  $("span:last-child", elemento).textContent = texto;
  elemento.hidden = false;
}

/* ---------- Diálogos de registro (progressive disclosure) ---------- */
function abrirDialogo(evento) {
  const dlg = $(`#${evento.currentTarget.dataset.abrir}`);
  const form = $("form", dlg);
  form.reset();
  $(".error-linea", form).hidden = true;
  dlg.showModal();
  $("input", form).focus();
}

function configurarDialogo({ dialogo, recurso, cuerpo, exito }) {
  const dlg = $(`#${dialogo}`);
  const form = $("form", dlg);
  const error = $(".error-linea", form);
  const guardar = $(".primario", form);

  $$("[data-cerrar]", dlg).forEach((b) => b.addEventListener("click", () => dlg.close()));
  dlg.addEventListener("click", (e) => { if (e.target === dlg) dlg.close(); });   // clic en el fondo

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!form.reportValidity()) return;
    error.hidden = true;
    guardar.disabled = true;
    try {
      const creado = await api("POST", recurso, cuerpo(new FormData(form)));
      ESTADO[recurso].nuevo = creado.id;
      dlg.close();
      aviso(exito(creado));
      await cargar(recurso, { silencioso: true });
    } catch (err) {
      mostrarError(error, err.status === 503 ? `${err.message} No se guardó nada; inténtalo de nuevo cuando vuelva.` : err.message);
    } finally {
      guardar.disabled = false;
    }
  });
}

configurarDialogo({
  dialogo: "dlg-producto", recurso: "productos",
  cuerpo: (v) => ({ nombre: v.get("nombre").trim(), precio: Number(v.get("precio")), stock: Number(v.get("stock")) }),
  exito: (p) => `${p.nombre} quedó en el catálogo`,
});
configurarDialogo({
  dialogo: "dlg-cliente", recurso: "clientes",
  cuerpo: (v) => ({ nombre: v.get("nombre").trim(), email: v.get("email").trim() }),
  exito: (c) => `${c.nombre} quedó registrado`,
});
$$("[data-abrir]").forEach((b) => b.addEventListener("click", abrirDialogo));

/* ---------- Formulario de pedido + tiquete en vivo ---------- */
const campo = { cliente: $("#sel-cliente"), producto: $("#sel-producto"), cantidad: $("#inp-cantidad") };

function llenarSelect(select, est, nombreServicio, textoOpcion) {
  const previo = select.value;
  select.replaceChildren();
  if (est.fase === "error") {
    select.append(new Option(`Servicio de ${nombreServicio} no disponible`, ""));
    select.disabled = true;
    return;
  }
  if (est.fase === "cargando" || !est.datos.length) {
    select.append(new Option(est.fase === "cargando" ? "Cargando…" : `No hay ${nombreServicio} registrados`, ""));
    select.disabled = true;
    return;
  }
  select.disabled = false;
  select.append(new Option("Selecciona una opción", ""));
  for (const item of est.datos) {
    const opcion = new Option(textoOpcion(item), item.id);
    if (item.stock === 0) opcion.disabled = true;
    select.append(opcion);
  }
  if ([...select.options].some((o) => o.value === previo && !o.disabled)) select.value = previo;
}

function sincronizarFormularioPedido() {
  llenarSelect(campo.cliente, ESTADO.clientes, "clientes", (c) => c.nombre);
  llenarSelect(campo.producto, ESTADO.productos, "productos",
    (p) => `${p.nombre} · ${cop.format(p.precio)}${p.stock === 0 ? " · agotado" : ""}`);
  actualizarTiquete();
}

function actualizarTiquete() {
  const cliente = ESTADO.clientes.datos.find((c) => String(c.id) === campo.cliente.value);
  const producto = ESTADO.productos.datos.find((p) => String(p.id) === campo.producto.value);
  const cantidad = parseInt(campo.cantidad.value, 10);
  const cantidadValida = Number.isInteger(cantidad) && cantidad >= 1;
  const excede = producto && cantidadValida && cantidad > producto.stock;

  $("#tq-cliente").textContent = cliente ? cliente.nombre : "—";
  $("#tq-producto").textContent = producto ? producto.nombre : "—";
  $("#tq-precio").textContent = producto ? cop.format(producto.precio) : "—";
  $("#tq-cantidad").textContent = cantidadValida ? String(cantidad) : "—";
  $("#tq-stock").textContent = producto && cantidadValida && !excede ? String(producto.stock - cantidad) : "—";
  $("#tq-total").textContent = producto && cantidadValida ? cop.format(producto.precio * cantidad) : "$0";

  const ayuda = $("#ayuda-cantidad");
  ayuda.classList.toggle("mal", Boolean(excede));
  ayuda.textContent = excede ? `Solo hay ${producto.stock} unidades disponibles. Baja la cantidad.`
    : producto ? `Disponibles: ${producto.stock}` : "";

  $("#btn-pedido").disabled = !(cliente && producto && cantidadValida && !excede);
}

[campo.cliente, campo.producto].forEach((c) => c.addEventListener("change", actualizarTiquete));
campo.cantidad.addEventListener("input", actualizarTiquete);

$("#form-pedido").addEventListener("submit", async (e) => {
  e.preventDefault();
  const error = $("#err-pedido");
  const boton = $("#btn-pedido");
  error.hidden = true;
  boton.disabled = true;
  try {
    const pedido = await api("POST", "pedidos", {
      cliente_id: Number(campo.cliente.value),
      producto_id: Number(campo.producto.value),
      cantidad: parseInt(campo.cantidad.value, 10),
    });
    ESTADO.pedidos.nuevo = pedido.id;
    campo.cantidad.value = 1;
    aviso(`Pedido ${pedido.id} confirmado por ${cop.format(pedido.total)}`);
    await Promise.all([cargar("pedidos", { silencioso: true }), cargar("productos", { silencioso: true })]);
  } catch (err) {
    const texto = err.status === 409 ? "No alcanzan las unidades. Baja la cantidad e inténtalo de nuevo."
      : err.status === 503 ? `${err.message} Tu pedido no se registró; inténtalo cuando el servicio vuelva.`
      : err.message;
    mostrarError(error, texto);
    if (err.status === 409) cargar("productos", { silencioso: true });
  } finally {
    actualizarTiquete();
  }
});

/* ---------- Tablero de servicios ---------- */
function construirTablero() {
  $("#board").replaceChildren(...Object.entries(RECURSOS).map(([clave, def]) =>
    h("li", { "data-servicio": clave },
      h("span", { class: "b-nombre" }, def.etiqueta),
      h("span", { class: "b-puerto" }, `:${def.puerto}`),
      h("span", { class: "b-estado" }, h("i", { class: "dot" }), h("span", {}, "Comprobando")),
      h("span", { class: "b-ms" }, ""))));
}

const estabaActivo = {};
async function actualizarTablero() {
  let datos = null;
  try { datos = await (await fetch("/api/estado")).json(); } catch { /* gateway no responde */ }

  for (const clave of Object.keys(RECURSOS)) {
    const item = datos && datos[clave];
    const activo = Boolean(item && item.ok);
    const li = $(`#board [data-servicio="${clave}"]`);
    li.className = datos ? (activo ? "st-ok" : "st-down") : "";
    $(".b-estado span:last-child", li).textContent = datos ? (activo ? "Activo" : "Caído") : "Sin conexión";
    $(".b-ms", li).textContent = activo ? `${item.ms} ms` : "";

    if (datos && activo && estabaActivo[clave] === false) cargar(clave);          // se recuperó: recarga sola
    if (datos && !activo && estabaActivo[clave] !== false && ESTADO[clave].fase === "ok") {
      ESTADO[clave].fase = "error";                                                 // se cayó: avisa en su panel
      ESTADO[clave].error = null;
      pintarPanel(clave); pintarMeta(clave);
      if (clave !== "pedidos") sincronizarFormularioPedido();
    }
    if (datos) estabaActivo[clave] = activo;
  }
}

/* ---------- Navegación por hash ---------- */
function vistaActual() {
  const v = location.hash.slice(1);
  return RECURSOS[v] ? v : "productos";
}

function mostrarVista(moverFoco) {
  const actual = vistaActual();
  $$(".view").forEach((s) => (s.hidden = s.id !== `v-${actual}`));
  $$(".nav a").forEach((a) => {
    if (a.dataset.vista === actual) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  document.title = `${RECURSOS[actual].etiqueta} · Tienda Virtual`;
  if (moverFoco) {
    $(`#t-${actual}`).focus();
    cargar(actual, { silencioso: true });
    if (actual === "pedidos") { cargar("clientes", { silencioso: true }); cargar("productos", { silencioso: true }); }
  }
}
window.addEventListener("hashchange", () => mostrarVista(true));

/* ---------- Inicio ---------- */
$$("[data-icono]").forEach((el) => el.replaceWith(icono(el.dataset.icono, Number(el.dataset.tam) || 20)));
construirTablero();
mostrarVista(false);
Object.keys(RECURSOS).forEach((r) => cargar(r));
actualizarTablero();
setInterval(actualizarTablero, 4000);
