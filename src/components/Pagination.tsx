interface PaginationProps {
  page: number
  totalPages: number
  onPageChange: (nextPage: number) => void
}

export default function Pagination({ page, totalPages, onPageChange }: PaginationProps) {
  if (totalPages <= 1) {
    return null
  }

  return (
    <div className="pagination" aria-label="Paginacion">
      <button
        className="button ghost-dark small"
        disabled={page <= 1}
        onClick={() => onPageChange(Math.max(1, page - 1))}
        aria-label="Pagina anterior"
      >
        Anterior
      </button>
      <span>
        Pagina {page} de {totalPages}
      </span>
      <button
        className="button ghost-dark small"
        disabled={page >= totalPages}
        onClick={() => onPageChange(Math.min(totalPages, page + 1))}
        aria-label="Pagina siguiente"
      >
        Siguiente
      </button>
    </div>
  )
}
