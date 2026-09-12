import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="empty-state">
      <h2>No encontramos esta página.</h2>
      <Button asChild variant="outline">
        <Link href="/inicio">Ir a inicio</Link>
      </Button>
    </div>
  );
}
