export function TeamMexMark({
  className,
  title = 'Team Mex',
}: {
  className?: string;
  title?: string;
}) {
  return (
    <svg
      className={className}
      viewBox="0 0 56 28"
      width="40"
      height="20"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
    >
      {title ? <title>{title}</title> : null}
      <rect x="34" y="5" width="20" height="13.5" rx="1.4" fill="#EA7515" />
      <rect x="34" y="5" width="20" height="3.2" fill="#F4A15C" />
      <rect x="16" y="7.5" width="18.5" height="13.5" rx="1.4" fill="#EA7515" />
      <rect x="16" y="7.5" width="18.5" height="3" fill="#F4A15C" />
      <path
        d="M1.8 14.2h8.2L12.6 8.2h5.2v14.2H5.1A3.3 3.3 0 0 1 1.8 19.1v-4.9Z"
        fill="#EA7515"
      />
      <rect x="6.2" y="11" width="5.2" height="3.6" rx="0.5" fill="#1B1F40" />
      <circle cx="8.2" cy="24.1" r="2.55" fill="#1B1F40" />
      <circle cx="24.4" cy="24.1" r="2.55" fill="#1B1F40" />
      <circle cx="43.6" cy="24.1" r="2.55" fill="#1B1F40" />
      <circle cx="8.2" cy="24.1" r="1" fill="#F3F3F3" />
      <circle cx="24.4" cy="24.1" r="1" fill="#F3F3F3" />
      <circle cx="43.6" cy="24.1" r="1" fill="#F3F3F3" />
    </svg>
  );
}

export function BrandPlate() {
  return (
    <span className="inline-flex items-center gap-2 text-white">
      <TeamMexMark />
      <span className="flex flex-col leading-[1.05]">
        <span className="text-[13px] font-semibold tracking-tight">
          Team Mex
        </span>
        <span className="text-[10px] font-normal uppercase tracking-[0.12em] text-white/50">
          Mantenimiento
        </span>
      </span>
    </span>
  );
}
