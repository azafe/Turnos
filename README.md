# Turnero EANA (Frontend React)

Aplicacion web para planificar turnos mensuales de torre de control, con estructura `Mes`, `Agenda` y `Estadisticas`.

## Stack
- React 19 + TypeScript + Vite
- Persistencia local con `localStorage`
- Import/Export Excel con `xlsx`
- Export PDF con `jspdf` + `jspdf-autotable`

## Funcionalidades
- Dotacion inicial precargada con nombres/cargos tomados del Excel compartido.
- Alta de controladores nuevos.
- Edicion por modal al hacer click en el nombre del controlador.
- Condicionantes mensuales:
  - Cobertura puntual por fecha y turno.
  - Vacaciones/licencias por rango.
  - Bloqueo semanal por dia y turno.
  - Bloqueo puntual por fecha y turno.
  - Asignaciones forzadas.
  - Feriados.
- Motor de asignacion automatica con reglas:
  - Turno A (07:00-15:00 local / 10:00-18:00 UTC): cobertura base 3.
  - Turno B (15:00-23:00 local / 18:00-02:00 UTC): cobertura base 3.
  - Turno C (23:00-07:00 local / 02:00-10:00 UTC): cobertura base 2.
  - A y B requieren supervisor.
  - Si hay practicante en el turno, debe haber instructor.
  - Si alguien trabaja C, no se asigna a A al dia siguiente.
  - Jefa/jefe dependencia se asigna automaticamente, excepto turno C.
  - Reparto equilibrado de carga total y por tipo de turno.
- Pestaña `Mes`: planilla diaria A/B/C + conflictos.
- Pestaña `Agenda`: almanaque para consultar rapidamente quien esta de turno cada dia.
- Pestaña `Estadisticas`: conteos por controlador.
- Exportacion:
  - Excel (`MES`, `ESTADISTICAS`).
  - PDF con estructura de planilla + pagina de estadisticas.

## Ejecutar
```bash
npm install
npm run dev
```

## Validar
```bash
npm run lint
npm run build
```

## Notas
- Version actual: frontend sin backend/API.
- Para operacion multiusuario en tiempo real, trazabilidad y permisos, se recomienda pasar a backend + base de datos (ej. Supabase) en una siguiente fase.
