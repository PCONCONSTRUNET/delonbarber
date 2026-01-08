import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      expand={true}
      richColors
      toastOptions={{
        duration: 5000,
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-2 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:p-4",
          description: "group-[.toast]:text-muted-foreground group-[.toast]:text-sm",
          actionButton: "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground group-[.toast]:font-semibold",
          cancelButton: "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
          success: "group-[.toaster]:!bg-green-950 group-[.toaster]:!border-green-500 group-[.toaster]:!text-green-100",
          error: "group-[.toaster]:!bg-red-950 group-[.toaster]:!border-red-500 group-[.toaster]:!text-red-100",
          warning: "group-[.toaster]:!bg-amber-950 group-[.toaster]:!border-amber-500 group-[.toaster]:!text-amber-100",
          info: "group-[.toaster]:!bg-blue-950 group-[.toaster]:!border-blue-500 group-[.toaster]:!text-blue-100",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-5 w-5 text-green-400" />,
        error: <XCircle className="h-5 w-5 text-red-400" />,
        warning: <AlertCircle className="h-5 w-5 text-amber-400" />,
        info: <Info className="h-5 w-5 text-blue-400" />,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
