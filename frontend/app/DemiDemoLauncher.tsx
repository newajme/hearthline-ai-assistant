"use client";

import { useState } from "react";

import DemiDemoModal from "./DemiDemoModal";
import { useI18n } from "./lib/i18n";

type Variant = "primary" | "onDark";

export default function DemiDemoLauncher({
  label,
  variant = "primary",
}: {
  label?: string;
  variant?: Variant;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const className =
    variant === "onDark"
      ? "btn btn-demi btn-lg btn-demi-onDark"
      : "btn btn-demi btn-lg";

  return (
    <>
      <button type="button" className={className} onClick={() => setOpen(true)}>
        <span className="btn-demi-dot" aria-hidden /> {label ?? t("demiLaunch.cta")}
      </button>
      <DemiDemoModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
