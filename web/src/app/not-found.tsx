import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="empty-state">
      <h2>No encontramos esta página</h2>
      <p className="muted">
        El recurso no existe o ya no está disponible. Revise la dirección o
        vuelva al listado de unidades.
      </p>
      <Button asChild>
        <Link href="/unidades">Ir a unidades</Link>
      </Button>
    </div>
  );
}
