import Image from 'next/image';

export function BrandPlate() {
  return (
    <span className="brand-plate">
      <Image
        src="/brand/logo-team-mex-shell-white.png"
        alt="Team Mex"
        width={704}
        height={378}
        priority
        unoptimized
        className="brand-plate__img"
      />
    </span>
  );
}
