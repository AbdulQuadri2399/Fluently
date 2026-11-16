import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full border-collapse text-small", className)} {...props} />
    </div>
  );
}
export function TableHeader(props: ComponentProps<"thead">) {
  return <thead {...props} />;
}
export function TableBody(props: ComponentProps<"tbody">) {
  return <tbody {...props} />;
}
export function TableRow({ className, ...props }: ComponentProps<"tr">) {
  return <tr className={cn("border-b border-border hover:bg-surface-2", className)} {...props} />;
}
export function TableHead({ className, ...props }: ComponentProps<"th">) {
  return (
    <th className={cn("px-3 py-2 text-left font-medium text-text-muted", className)} {...props} />
  );
}
export function TableCell({ className, ...props }: ComponentProps<"td">) {
  return <td className={cn("px-3 py-2 align-middle", className)} {...props} />;
}
