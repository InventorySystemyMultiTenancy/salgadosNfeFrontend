function Svg({ children, size = 17, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      {children}
    </svg>
  );
}

export function IconPDV(props) {
  return (
    <Svg {...props}>
      <path d="M3 9h18M5 9l1.5 10.5A2 2 0 0 0 8.5 21h7a2 2 0 0 0 2-1.5L19 9M9 9V6a3 3 0 0 1 6 0v3" />
    </Svg>
  );
}

export function IconCozinha(props) {
  return (
    <Svg {...props}>
      <path d="M5 10c0-3.5 3-6 7-6s7 2.5 7 6M4 10h16l-1 3H5l-1-3ZM6 13v6h12v-6M9 19v1M15 19v1" />
    </Svg>
  );
}

export function IconProdutos(props) {
  return (
    <Svg {...props}>
      <path d="M21 8 12 3 3 8l9 5 9-5Zm0 0v8l-9 5-9-5V8m9 5v8" />
    </Svg>
  );
}

export function IconClientes(props) {
  return (
    <Svg {...props}>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3.5 20a5.6 5.6 0 0 1 11 0" />
      <circle cx="17.5" cy="9" r="2.6" />
      <path d="M15.5 13.3A4.3 4.3 0 0 1 20.5 17.5" />
    </Svg>
  );
}

export function IconCobranca(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="13" rx="2.2" />
      <path d="M3 10h18" />
      <circle cx="16.5" cy="14" r="1.4" fill="currentColor" stroke="none" />
    </Svg>
  );
}

export function IconEstoque(props) {
  return (
    <Svg {...props}>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
      <path d="M4 8.5 12 13l8-4.5M12 13v7" />
    </Svg>
  );
}

export function IconUsuarios(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M5 20a7 7 0 0 1 14 0" />
    </Svg>
  );
}

export function IconFiscal(props) {
  return (
    <Svg {...props}>
      <path d="M6 3h9l4 4v13a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1Z" />
      <path d="M8 9h7M8 12.5h7M8 16h4.5" />
    </Svg>
  );
}

export function IconConfig(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="2.8" />
      <path d="M19.4 13.9a1.9 1.9 0 0 0 .4 2.1l.1.1a2.3 2.3 0 1 1-3.3 3.3l-.1-.1a1.9 1.9 0 0 0-2.1-.4 1.9 1.9 0 0 0-1.1 1.7v.2a2.3 2.3 0 1 1-4.6 0v-.1a1.9 1.9 0 0 0-1.2-1.7 1.9 1.9 0 0 0-2.1.4l-.1.1a2.3 2.3 0 1 1-3.3-3.3l.1-.1a1.9 1.9 0 0 0 .4-2.1 1.9 1.9 0 0 0-1.7-1.1H4a2.3 2.3 0 1 1 0-4.6h.1a1.9 1.9 0 0 0 1.7-1.2 1.9 1.9 0 0 0-.4-2.1l-.1-.1A2.3 2.3 0 1 1 8.6 1.5l.1.1a1.9 1.9 0 0 0 2.1.4H11a1.9 1.9 0 0 0 1.1-1.7V.1a2.3 2.3 0 1 1 4.6 0v.1a1.9 1.9 0 0 0 1.1 1.7 1.9 1.9 0 0 0 2.1-.4l.1-.1a2.3 2.3 0 1 1 3.3 3.3l-.1.1a1.9 1.9 0 0 0-.4 2.1V7a1.9 1.9 0 0 0 1.7 1.1h.2a2.3 2.3 0 1 1 0 4.6h-.1a1.9 1.9 0 0 0-1.7 1.2Z" transform="translate(0.4 1.2) scale(0.86)" />
    </Svg>
  );
}

export function IconCard(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="5.5" width="18" height="13" rx="2" />
      <path d="M3 10h18M7 15h3" />
    </Svg>
  );
}

export function IconLogout(props) {
  return (
    <Svg size={14} strokeWidth="2" {...props}>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5M21 12H9" />
    </Svg>
  );
}

export function IconChevronDown(props) {
  return (
    <Svg size={14} strokeWidth="2" {...props}>
      <path d="M6 9l6 6 6-6" />
    </Svg>
  );
}

export function IconPlus(props) {
  return (
    <Svg size={16} strokeWidth="2.6" {...props}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconMinus(props) {
  return (
    <Svg size={11} strokeWidth="2.6" {...props}>
      <path d="M5 12h14" />
    </Svg>
  );
}

export function IconClose(props) {
  return (
    <Svg size={13} strokeWidth="2.2" {...props}>
      <path d="M6 6l12 12M18 6L6 18" />
    </Svg>
  );
}

export function IconSearch(props) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
    </Svg>
  );
}

export function IconBox(props) {
  return (
    <Svg size={13} {...props}>
      <path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" />
      <path d="M4 8.5 12 13l8-4.5" />
    </Svg>
  );
}

export function IconReceipt(props) {
  return (
    <Svg size={38} strokeWidth="1.5" {...props}>
      <path d="M6 2h9l4 4v14a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V3a1 1 0 0 1 1-1Z" />
      <path d="M9 9h6M9 12.5h6M9 16h3.5" />
    </Svg>
  );
}

export function IconUtensils(props) {
  return (
    <Svg size={44} strokeWidth="1.6" {...props}>
      <path d="M7 3v7a2 2 0 0 0 2 2v9M7 3v7M9 3v7M9 12v9M15 3c-1.5 0-2.5 1.8-2.5 4.5S13.5 12 15 12s2.5-1.8 2.5-4.5S16.5 3 15 3Zm0 9v9" />
    </Svg>
  );
}

export function IconMail(props) {
  return (
    <Svg {...props}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m4 7 8 6 8-6" />
    </Svg>
  );
}

export function IconLock(props) {
  return (
    <Svg {...props}>
      <rect x="4.5" y="10.5" width="15" height="10" rx="2" />
      <path d="M8 10.5V7.5a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

export function IconEye(props) {
  return (
    <Svg {...props}>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="2.8" />
    </Svg>
  );
}

export function IconEyeOff(props) {
  return (
    <Svg {...props}>
      <path d="M3 3l18 18M10.6 6a9.7 9.7 0 0 1 1.4-.1c6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-2.8 3.5M6.3 7.4C3.9 9.1 2.5 12 2.5 12S6 18.5 12 18.5c1.6 0 3-.4 4.2-1M9.9 9.9a2.8 2.8 0 0 0 4 4" />
    </Svg>
  );
}
