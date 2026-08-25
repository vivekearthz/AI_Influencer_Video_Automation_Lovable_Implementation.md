import { Toaster as Sonner } from "sonner";

export function Toaster() {
  return (
    <Sonner
      theme="dark"
      position="top-right"
      toastOptions={{
        classNames: {
          toast: "bg-card border border-border text-foreground",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
