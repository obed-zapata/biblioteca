/* Pantalla del sistema: lee los formularios, llama a las reglas y pinta las tablas. */
(function () {
  "use strict";
  var P = window.Prestamos;
  var CLAVE = "biblioteca-prestamos-v1";
  var datos = cargar();

  function cargar() {
    try {
      var texto = localStorage.getItem(CLAVE);
      if (texto) return JSON.parse(texto);
    } catch (e) { /* sin almacenamiento: se trabaja en memoria */ }
    return P.datosIniciales();
  }

  function guardar() {
    try { localStorage.setItem(CLAVE, JSON.stringify(datos)); } catch (e) { /* se ignora */ }
  }

  function $(id) { return document.getElementById(id); }
  function hoy() { return $("fecha-hoy").value; }

  function celda(texto) {
    var td = document.createElement("td");
    td.textContent = texto;
    return td;
  }

  function fila(celdas) {
    var tr = document.createElement("tr");
    celdas.forEach(function (c) { tr.appendChild(typeof c === "string" ? celda(c) : c); });
    return tr;
  }

  function vacio(tbody, columnas, texto) {
    var td = celda(texto);
    td.colSpan = columnas;
    td.className = "vacio";
    tbody.appendChild(fila([td]));
  }

  function avisar(texto, tipo) {
    var caja = $("aviso");
    caja.textContent = texto;
    caja.className = "aviso " + tipo;
  }

  function pintar() {
    // Libros disponibles en el formulario
    var select = $("libro");
    select.innerHTML = "";
    datos.libros.filter(function (l) { return P.libroDisponible(datos, l.id); }).forEach(function (l) {
      var op = document.createElement("option");
      op.value = l.id;
      op.textContent = l.titulo + " — " + l.autor;
      select.appendChild(op);
    });

    // Préstamos activos
    var activos = $("tabla-activos");
    activos.innerHTML = "";
    var lista = datos.prestamos.filter(function (p) { return !p.fechaDevolucion; });
    lista.forEach(function (p) {
      var alumno = P.buscarAlumno(datos, p.matricula);
      var libro = P.buscarLibro(datos, p.libroId);
      var boton = document.createElement("button");
      boton.textContent = "Devolver";
      boton.className = "secundario";
      boton.addEventListener("click", function () {
        var r = P.registrarDevolucion(datos, p.id, hoy());
        avisar(r.ok ? "Devolución registrada: «" + libro.titulo + "» vuelve a estar disponible." : r.motivo, r.ok ? "ok" : "error");
        guardar(); pintar();
      });
      var accion = document.createElement("td");
      accion.appendChild(boton);
      var tr = fila([p.id, alumno.nombre + " (" + p.matricula + ")", libro.titulo, p.fechaPrestamo, p.fechaLimite, accion]);
      if (P.estaVencido(p, hoy())) tr.className = "vencido";
      activos.appendChild(tr);
    });
    if (!lista.length) vacio(activos, 6, "No hay préstamos activos.");

    // Préstamos vencidos
    var vencidos = $("tabla-vencidos");
    vencidos.innerHTML = "";
    var v = P.prestamosVencidos(datos, hoy());
    v.forEach(function (x) {
      vencidos.appendChild(fila([x.alumno.nombre + " (" + x.alumno.matricula + ")", x.libro.titulo, x.prestamo.fechaLimite, String(x.diasDeRetraso)]));
    });
    if (!v.length) vacio(vencidos, 4, "No hay préstamos vencidos.");
    $("total-vencidos").textContent = String(v.length);

    // Alumnos de ejemplo
    $("alumnos").textContent = datos.alumnos.map(function (a) { return a.matricula + " " + a.nombre; }).join(" · ");
  }

  $("form-prestamo").addEventListener("submit", function (e) {
    e.preventDefault();
    var matricula = $("matricula").value.trim().toUpperCase();
    var r = P.registrarPrestamo(datos, matricula, $("libro").value, hoy());
    if (r.ok) {
      avisar("Préstamo " + r.prestamo.id + " registrado. Fecha límite de devolución: " + r.prestamo.fechaLimite + ".", "ok");
      $("matricula").value = "";
    } else {
      avisar(r.motivo, "error");
    }
    guardar(); pintar();
  });

  $("fecha-hoy").addEventListener("change", pintar);

  $("reiniciar").addEventListener("click", function () {
    datos = P.datosIniciales();
    guardar();
    avisar("Se restablecieron los datos de ejemplo.", "ok");
    pintar();
  });

  $("fecha-hoy").value = new Date().toISOString().slice(0, 10);
  pintar();
})();
