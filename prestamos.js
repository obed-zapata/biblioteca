/*
 * Reglas del sistema de préstamos de la biblioteca escolar.
 * Este archivo no toca la pantalla: solo recibe datos y devuelve resultados.
 */
(function (global) {
  "use strict";

  var MAX_LIBROS_POR_ALUMNO = 3;
  var DIAS_DE_PRESTAMO = 7;

  // Suma días naturales a una fecha con formato AAAA-MM-DD.
  function sumarDias(fecha, dias) {
    var p = fecha.split("-").map(Number);
    var d = new Date(Date.UTC(p[0], p[1] - 1, p[2] + dias));
    return d.toISOString().slice(0, 10);
  }

  // Días completos entre dos fechas AAAA-MM-DD (positivo si "hasta" es posterior).
  function diasEntre(desde, hasta) {
    var a = desde.split("-").map(Number);
    var b = hasta.split("-").map(Number);
    var ms = Date.UTC(b[0], b[1] - 1, b[2]) - Date.UTC(a[0], a[1] - 1, a[2]);
    return Math.round(ms / 86400000);
  }

  function prestamosActivos(datos, matricula) {
    return datos.prestamos.filter(function (p) {
      return p.matricula === matricula && !p.fechaDevolucion;
    });
  }

  function estaVencido(prestamo, hoy) {
    return !prestamo.fechaDevolucion && diasEntre(prestamo.fechaLimite, hoy) > 0;
  }

  function prestamosVencidos(datos, hoy) {
    return datos.prestamos
      .filter(function (p) { return estaVencido(p, hoy); })
      .map(function (p) {
        return {
          prestamo: p,
          alumno: buscarAlumno(datos, p.matricula),
          libro: buscarLibro(datos, p.libroId),
          diasDeRetraso: diasEntre(p.fechaLimite, hoy)
        };
      });
  }

  function buscarAlumno(datos, matricula) {
    return datos.alumnos.find(function (a) { return a.matricula === matricula; }) || null;
  }

  function buscarLibro(datos, libroId) {
    return datos.libros.find(function (l) { return l.id === libroId; }) || null;
  }

  function libroDisponible(datos, libroId) {
    return !datos.prestamos.some(function (p) {
      return p.libroId === libroId && !p.fechaDevolucion;
    });
  }

  // Registra un préstamo si se cumplen todas las reglas.
  // Devuelve { ok: true, prestamo } o { ok: false, motivo }.
  function registrarPrestamo(datos, matricula, libroId, hoy) {
    var alumno = buscarAlumno(datos, matricula);
    if (!alumno) return { ok: false, motivo: "No existe un alumno con la matrícula " + matricula + "." };

    var libro = buscarLibro(datos, libroId);
    if (!libro) return { ok: false, motivo: "El libro no existe en el catálogo." };
    if (!libroDisponible(datos, libroId)) return { ok: false, motivo: "El libro ya está prestado." };

    var activos = prestamosActivos(datos, matricula);
    if (activos.some(function (p) { return estaVencido(p, hoy); })) {
      return { ok: false, motivo: "El alumno tiene préstamos vencidos y no puede recibir otro libro." };
    }
    if (activos.length >= MAX_LIBROS_POR_ALUMNO) {
      return { ok: false, motivo: "El alumno ya tiene " + MAX_LIBROS_POR_ALUMNO + " libros prestados, que es el máximo." };
    }

    var prestamo = {
      id: "P" + String(datos.prestamos.length + 1).padStart(3, "0"),
      matricula: matricula,
      libroId: libroId,
      fechaPrestamo: hoy,
      fechaLimite: sumarDias(hoy, DIAS_DE_PRESTAMO),
      fechaDevolucion: null
    };
    datos.prestamos.push(prestamo);
    return { ok: true, prestamo: prestamo };
  }

  // Registra la devolución: cierra el préstamo y el libro vuelve a estar disponible.
  function registrarDevolucion(datos, prestamoId, hoy) {
    var prestamo = datos.prestamos.find(function (p) { return p.id === prestamoId; });
    if (!prestamo) return { ok: false, motivo: "No existe el préstamo " + prestamoId + "." };
    if (prestamo.fechaDevolucion) return { ok: false, motivo: "Ese préstamo ya fue devuelto." };
    prestamo.fechaDevolucion = hoy;
    return { ok: true, prestamo: prestamo };
  }

  function datosIniciales() {
    return {
      alumnos: [
        { matricula: "A001", nombre: "Ana López" },
        { matricula: "A002", nombre: "Bruno Méndez" },
        { matricula: "A003", nombre: "Carla Ríos" },
        { matricula: "A004", nombre: "Diego Sánchez" }
      ],
      libros: [
        { id: "L001", titulo: "Pedro Páramo", autor: "Juan Rulfo" },
        { id: "L002", titulo: "El llano en llamas", autor: "Juan Rulfo" },
        { id: "L003", titulo: "Cien años de soledad", autor: "Gabriel García Márquez" },
        { id: "L004", titulo: "Aura", autor: "Carlos Fuentes" },
        { id: "L005", titulo: "Como agua para chocolate", autor: "Laura Esquivel" },
        { id: "L006", titulo: "El laberinto de la soledad", autor: "Octavio Paz" },
        { id: "L007", titulo: "Los de abajo", autor: "Mariano Azuela" },
        { id: "L008", titulo: "Balún Canán", autor: "Rosario Castellanos" }
      ],
      prestamos: []
    };
  }

  var api = {
    MAX_LIBROS_POR_ALUMNO: MAX_LIBROS_POR_ALUMNO,
    DIAS_DE_PRESTAMO: DIAS_DE_PRESTAMO,
    sumarDias: sumarDias,
    diasEntre: diasEntre,
    prestamosActivos: prestamosActivos,
    prestamosVencidos: prestamosVencidos,
    estaVencido: estaVencido,
    buscarAlumno: buscarAlumno,
    buscarLibro: buscarLibro,
    libroDisponible: libroDisponible,
    registrarPrestamo: registrarPrestamo,
    registrarDevolucion: registrarDevolucion,
    datosIniciales: datosIniciales
  };

  if (typeof module !== "undefined" && module.exports) module.exports = api;
  else global.Prestamos = api;
})(typeof window !== "undefined" ? window : globalThis);
