import Image from 'next/image';

export function BrandPlate() {
  return (
    <span className="inline-flex items-center">
      <Image
        src="/brand/logo-team-mex-shell-white.png"
        alt="Team Mex"
        width={500}
        height={218}
        priority
        className="h-7 w-auto max-h-9 object-contain object-left md:h-8"
      />
    </span>
  );
}
