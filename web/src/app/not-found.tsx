export default function NotFound() {
  return (
    <div className="empty-state">
      <h2>No encontramos esta página</h2>
      <p className="muted">
        El recurso no existe o ya no está disponible. Revise la dirección o
        vuelva al listado de unidades.
      </p>
      <a className="btn btn-primary" href="/unidades">
        Ir a unidades
      </a>
    </div>
  );
}
