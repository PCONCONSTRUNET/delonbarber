import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-center"
      expand={true}
      visibleToasts={3}
      toastOptions={{
        duration: 6000,
        classNames: {
          toast:
            "group toast group-[.toaster]:border-2 group-[.toaster]:shadow-2xl group-[.toaster]:rounded-xl group-[.toaster]:p-4 group-[.toaster]:min-h-[70px]",
          title: "group-[.toast]:font-bold group-[.toast]:text-base",
          description: "group-[.toast]:text-sm group-[.toast]:opacity-90",
          actionButton: "group-[.toast]:bg-white group-[.toast]:text-black group-[.toast]:font-bold group-[.toast]:rounded-lg",
          cancelButton: "group-[.toast]:bg-white/20 group-[.toast]:text-white",
          success: "group-[.toaster]:!bg-emerald-900 group-[.toaster]:!border-emerald-400 group-[.toaster]:!text-emerald-50",
          error: "group-[.toaster]:!bg-red-900 group-[.toaster]:!border-red-400 group-[.toaster]:!text-red-50",
          warning: "group-[.toaster]:!bg-amber-900 group-[.toaster]:!border-amber-400 group-[.toaster]:!text-amber-50",
          info: "group-[.toaster]:!bg-blue-900 group-[.toaster]:!border-blue-400 group-[.toaster]:!text-blue-50",
        },
      }}
      icons={{
        success: <CheckCircle2 className="h-6 w-6 text-emerald-300" />,
        error: <XCircle className="h-6 w-6 text-red-300" />,
        warning: <AlertTriangle className="h-6 w-6 text-amber-300" />,
        info: <Info className="h-6 w-6 text-blue-300" />,
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
