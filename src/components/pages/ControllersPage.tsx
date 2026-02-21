import { useState } from 'react'
import { ROLE_OPTIONS } from '../../defaults'
import type { Controller, ControllerRole } from '../../types'
import Pagination from '../Pagination'

interface ControllerDraft {
  name: string
  role: ControllerRole
  condition: string
  pending: number
}

interface PaginationResult<T> {
  items: T[]
  currentPage: number
  totalPages: number
  totalItems: number
  startItem: number
  endItem: number
}

interface ControllersPageProps {
  controllerQuery: string
  onControllerQueryChange: (value: string) => void
  controllerPagination: PaginationResult<Controller>
  onControllerPageChange: (nextPage: number) => void
  onAddController: (draft: ControllerDraft) => void
  onUpdateController: (controllerId: string, draft: ControllerDraft) => void
  onRemoveController: (controllerId: string) => void
}

const EMPTY_CONTROLLER_DRAFT: ControllerDraft = {
  name: '',
  role: 'OPERADOR',
  condition: '',
  pending: 0,
}

export default function ControllersPage({
  controllerQuery,
  onControllerQueryChange,
  controllerPagination,
  onControllerPageChange,
  onAddController,
  onUpdateController,
  onRemoveController,
}: ControllersPageProps) {
  const [controllerForm, setControllerForm] = useState<ControllerDraft>(EMPTY_CONTROLLER_DRAFT)
  const [editingControllerId, setEditingControllerId] = useState<string | null>(null)
  const [editingControllerForm, setEditingControllerForm] = useState<ControllerDraft>(EMPTY_CONTROLLER_DRAFT)

  const openEditControllerModal = (controller: Controller): void => {
    setEditingControllerId(controller.id)
    setEditingControllerForm({
      name: controller.name,
      role: controller.role,
      condition: controller.condition,
      pending: controller.pending,
    })
  }

  const closeEditControllerModal = (): void => {
    setEditingControllerId(null)
    setEditingControllerForm(EMPTY_CONTROLLER_DRAFT)
  }

  return (
    <main className="page">
      <section className="section-card">
        <h2>Controladores</h2>

        <div className="search-row">
          <input
            placeholder="Buscar controlador por nombre"
            value={controllerQuery}
            onChange={(event) => onControllerQueryChange(event.target.value)}
            aria-label="Buscar controlador"
          />
          <span className="dim">
            Mostrando {controllerPagination.startItem}-{controllerPagination.endItem} de {controllerPagination.totalItems}
          </span>
        </div>

        <div className="row-inline responsive">
          <input
            placeholder="Nombre"
            value={controllerForm.name}
            onChange={(event) => setControllerForm((current) => ({ ...current, name: event.target.value }))}
            aria-label="Nombre del controlador"
          />

          <select
            value={controllerForm.role}
            onChange={(event) =>
              setControllerForm((current) => ({
                ...current,
                role: event.target.value as ControllerRole,
              }))
            }
            aria-label="Cargo del controlador"
          >
            {ROLE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            placeholder="Condicionante"
            value={controllerForm.condition}
            onChange={(event) => setControllerForm((current) => ({ ...current, condition: event.target.value }))}
            aria-label="Condicionante del controlador"
          />

          <input
            type="number"
            min={0}
            value={controllerForm.pending}
            onChange={(event) =>
              setControllerForm((current) => ({
                ...current,
                pending: Number(event.target.value),
              }))
            }
            placeholder="Pendientes"
            aria-label="Turnos pendientes"
          />

          <button
            className="button"
            onClick={() => {
              onAddController(controllerForm)
              setControllerForm(EMPTY_CONTROLLER_DRAFT)
            }}
            aria-label="Agregar controlador"
          >
            Agregar
          </button>
        </div>

        <div className="table-wrapper desktop-only">
          <table>
            <thead>
              <tr>
                <th>Nombre</th>
                <th>Cargo</th>
                <th>Condicionante</th>
                <th>Pendiente</th>
              </tr>
            </thead>
            <tbody>
              {controllerPagination.items.map((controller) => (
                <tr key={controller.id}>
                  <td>
                    <button className="name-link" onClick={() => openEditControllerModal(controller)}>
                      {controller.name}
                    </button>
                  </td>
                  <td>
                    <RoleBadge role={controller.role} />
                  </td>
                  <td>{controller.condition || '-'}</td>
                  <td>{controller.pending}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mobile-only stack-list">
          {controllerPagination.items.map((controller) => (
            <article key={`mobile-${controller.id}`} className="stack-card">
              <div className="stack-head">
                <button className="name-link" onClick={() => openEditControllerModal(controller)}>
                  {controller.name}
                </button>
              </div>
              <div className="stack-grid">
                <p>
                  <strong>Cargo:</strong> <RoleBadge role={controller.role} compact />
                </p>
                <p>
                  <strong>Pendiente:</strong> {controller.pending}
                </p>
                <p>
                  <strong>Condicionante:</strong> {controller.condition || '-'}
                </p>
              </div>
            </article>
          ))}
        </div>

        <Pagination
          page={controllerPagination.currentPage}
          totalPages={controllerPagination.totalPages}
          onPageChange={onControllerPageChange}
        />
      </section>

      {editingControllerId ? (
        <div className="modal-backdrop" onClick={closeEditControllerModal}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <h3>Editar controlador</h3>
            <div className="modal-grid">
              <label>
                Nombre
                <input
                  value={editingControllerForm.name}
                  onChange={(event) =>
                    setEditingControllerForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Cargo
                <select
                  value={editingControllerForm.role}
                  onChange={(event) =>
                    setEditingControllerForm((current) => ({
                      ...current,
                      role: event.target.value as ControllerRole,
                    }))
                  }
                >
                  {ROLE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Condicionante
                <textarea
                  rows={3}
                  value={editingControllerForm.condition}
                  onChange={(event) =>
                    setEditingControllerForm((current) => ({
                      ...current,
                      condition: event.target.value,
                    }))
                  }
                />
              </label>
              <label>
                Pendientes
                <input
                  type="number"
                  min={0}
                  value={editingControllerForm.pending}
                  onChange={(event) =>
                    setEditingControllerForm((current) => ({
                      ...current,
                      pending: Number(event.target.value),
                    }))
                  }
                />
              </label>
            </div>
            <div className="modal-actions">
              <button
                className="button subtle-danger"
                onClick={() => {
                  if (!editingControllerId) {
                    return
                  }
                  onRemoveController(editingControllerId)
                  closeEditControllerModal()
                }}
              >
                Quitar controlador
              </button>
              <button
                className="button"
                onClick={() => {
                  if (!editingControllerId) {
                    return
                  }
                  onUpdateController(editingControllerId, editingControllerForm)
                  closeEditControllerModal()
                }}
              >
                Guardar cambios
              </button>
              <button className="button ghost-dark" onClick={closeEditControllerModal}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

function RoleBadge({ role, compact = false }: { role: ControllerRole; compact?: boolean }) {
  const text = compact ? roleShort(role) : roleLabel(role)
  return <span className={`role-badge role-${role.toLowerCase()}`}>{text}</span>
}

function roleLabel(role: ControllerRole): string {
  return ROLE_OPTIONS.find((item) => item.value === role)?.label ?? role
}

function roleShort(role: ControllerRole): string {
  if (role === 'JEFE_DEPENDENCIA') {
    return 'JD'
  }
  if (role === 'SUPERVISOR') {
    return 'SUP'
  }
  if (role === 'INSTRUCTOR') {
    return 'INST'
  }
  if (role === 'OPERADOR') {
    return 'OP'
  }
  if (role === 'PRACTICANTE') {
    return 'PRAC'
  }
  return 'ADS'
}
