export function BrandMark({ small = false }: { small?: boolean }) {
  return (
    <svg
      width={small ? 32 : 42}
      height={small ? 32 : 42}
      viewBox="0 0 42 42"
      fill="none"
      aria-hidden="true"
    >
      <rect width="42" height="42" rx="12" fill="currentColor" />
      <path
        d="M10 28V17l11-8 11 8v11h-7V18l-4-3-4 3v10h-7Z"
        stroke="white"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M21 27v-6"
        stroke="#C8D8BE"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
