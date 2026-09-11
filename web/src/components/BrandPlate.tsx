import Image from 'next/image';

export function BrandPlate() {
  return (
    <span className="inline-flex items-center">
      <Image
        src="/brand/logo-team-mex-shell-white.png"
        alt="Team Mex"
        width={516}
        height={234}
        priority
        unoptimized
        className="h-9 w-auto max-h-9 object-contain object-left"
      />
    </span>
  );
}
