"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { CircleNotch } from "@phosphor-icons/react/dist/ssr";
import { Slot } from "radix-ui";
import { useId, type ComponentProps, type MouseEvent } from "react";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { mi } from "@/lib/motion";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex min-h-9 items-center justify-center gap-2 whitespace-nowrap rounded-sm px-4 text-small font-medium transition-colors duration-fast ease-standard focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink disabled:opacity-40 aria-disabled:cursor-not-allowed aria-disabled:opacity-40 [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-action text-on-action hover:opacity-90",
        secondary: "border border-line-strong bg-surface text-ink hover:bg-soft",
        ghost: "text-ink hover:bg-soft",
        danger: "bg-bad text-on-action hover:opacity-90",
      },
      size: {
        default: "h-9",
        sm: "h-8 px-3",
        icon: "size-9 px-0",
      },
    },
    defaultVariants: { variant: "primary", size: "default" },
  },
);

export type ButtonProps = ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner and swaps the label (03b: label changes to "…ing"). Copy comes from 03. */
    loading?: boolean;
    loadingLabel?: string;
    /** Disables the button while keeping it focusable, and tells people why (03b §6). */
    disabledReason?: string;
  };

export function Button({
  className,
  variant,
  size,
  asChild = false,
  loading = false,
  loadingLabel,
  disabledReason,
  onClick,
  children,
  ...props
}: ButtonProps) {
  const reduced = useReducedMotion();
  const reasonId = useId();
  const Comp = asChild ? Slot.Root : "button";
  const blocked = Boolean(disabledReason) || loading;

  function handleClick(e: MouseEvent<HTMLButtonElement>) {
    if (blocked) {
      e.preventDefault();
      return;
    }
    onClick?.(e);
  }

  return (
    <>
      <Comp
        data-variant={variant ?? "primary"}
        className={cn(buttonVariants({ variant, size }), !reduced && mi.press, className)}
        aria-disabled={blocked || undefined}
        aria-busy={loading || undefined}
        aria-describedby={disabledReason ? reasonId : undefined}
        title={disabledReason}
        onClick={handleClick}
        {...props}
      >
        {loading ? (
          <>
            {reduced ? (
              <span aria-hidden="true">…</span>
            ) : (
              <CircleNotch className="animate-spin" aria-hidden="true" />
            )}
            {loadingLabel ?? children}
          </>
        ) : (
          children
        )}
      </Comp>
      {disabledReason ? (
        <span id={reasonId} className="sr-only">
          {disabledReason}
        </span>
      ) : null}
    </>
  );
}

export { buttonVariants };
