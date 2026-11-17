export function SimapasEmblem({ className = 'w-9 h-9' }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <rect width="40" height="40" rx="8" fill="#0F2942" />
      <path
        d="M20 6L31 11V20.5C31 27.2 26.3 32.5 20 34.5C13.7 32.5 9 27.2 9 20.5V11L20 6Z"
        stroke="#E2E8F0"
        strokeWidth="1.5"
      />
      <path d="M13.5 16.5H26.5V20.5H13.5V16.5Z" fill="#B91C1C" />
      <path d="M13.5 20.5H26.5V24.5H13.5V20.5Z" fill="#FFFFFF" />
      <path d="M20 11L22.2 14.5H17.8L20 11Z" fill="#D97706" />
      <path d="M15 27.5C17.5 28.8 22.5 28.8 25 27.5" stroke="#D97706" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
