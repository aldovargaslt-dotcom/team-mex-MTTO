import Image from 'next/image';

export function BrandPlate() {
  return (
    <span className="inline-flex items-center rounded-sm bg-white px-1.5 py-0.5">
      <Image
        src="/brand/logo-team-mex-mensajeria.png"
        alt="Team Mex Mensajería y Paquetería"
        width={500}
        height={218}
        priority
        className="h-8 w-auto max-h-10 object-contain object-left md:h-9"
      />
    </span>
  );
}
