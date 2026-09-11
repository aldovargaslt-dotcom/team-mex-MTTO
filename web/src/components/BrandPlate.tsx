export function BrandPlate() {
  return (
    <span className="brand-plate">
      <svg
        className="brand-logo"
        viewBox="0 0 32 32"
        width="28"
        height="28"
        aria-hidden="true"
      >
        <rect width="32" height="32" rx="7" fill="#EA7515" />
        <path
          d="M8 23V9h5.1c2.9 0 4.6 1.5 4.6 3.8 0 1.5-.8 2.7-2.2 3.3L18.9 23h-3.5l-3.1-6.1H11.4V23H8zm3.4-8.8h1.5c1.2 0 1.9-.6 1.9-1.5s-.7-1.5-1.9-1.5h-1.5v3z"
          fill="#24284D"
        />
      </svg>
      <span className="brand-copy">
        <span className="brand-name">Team Mex</span>
        <span className="brand-sub">Mantenimiento</span>
      </span>
    </span>
  );
}
