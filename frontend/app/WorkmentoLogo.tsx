type WorkmentoLogoProps = {
  variant?: "mark" | "wordmark" | "lockup";
  className?: string;
};

export default function WorkmentoLogo({ variant = "lockup", className }: WorkmentoLogoProps) {
  const cls = ["workmento-logo", `workmento-logo-${variant}`, className].filter(Boolean).join(" ");

  if (variant === "wordmark" || variant === "lockup") {
    return <img className={cls} src="/branding/workmento-wordmark-tight.png" alt="Workmento" />;
  }

  return <img className={cls} src="/branding/workmento-mark.png" alt="Workmento logo mark" />;
}
