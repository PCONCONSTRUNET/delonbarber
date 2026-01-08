import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Menu, X, Scissors } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Home", path: "/" },
  { label: "Serviços", path: "/servicos" },
  { label: "Agendar", path: "/agendar" },
];

export function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 transition-all duration-300",
        isScrolled ? "glass-effect py-3" : "bg-transparent py-5"
      )}
    >
      <nav className="container mx-auto px-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="relative">
            <Scissors className="h-8 w-8 text-primary transition-transform duration-300 group-hover:rotate-45" />
            <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <span className="font-display text-xl font-semibold tracking-wider">
            ALAN DELON
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "relative font-medium text-sm tracking-wide transition-colors hover:text-primary",
                location.pathname === item.path
                  ? "text-primary"
                  : "text-foreground/80"
              )}
            >
              {item.label}
              {location.pathname === item.path && (
                <span className="absolute -bottom-1 left-0 right-0 h-0.5 bg-primary rounded-full" />
              )}
            </Link>
          ))}
          <Link to="/login">
            <Button variant="outline" size="sm" className="border-primary/50 hover:bg-primary hover:text-primary-foreground">
              Login
            </Button>
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className="md:hidden p-2 text-foreground"
          onClick={() => setIsOpen(!isOpen)}
          aria-label="Toggle menu"
        >
          {isOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </nav>

      {/* Mobile Menu */}
      <div
        className={cn(
          "md:hidden absolute top-full left-0 right-0 glass-effect transition-all duration-300 overflow-hidden",
          isOpen ? "max-h-80 border-b border-border" : "max-h-0"
        )}
      >
        <div className="container mx-auto px-4 py-4 flex flex-col gap-4">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className={cn(
                "py-2 font-medium transition-colors",
                location.pathname === item.path
                  ? "text-primary"
                  : "text-foreground/80"
              )}
            >
              {item.label}
            </Link>
          ))}
          <Link to="/login" onClick={() => setIsOpen(false)}>
            <Button variant="outline" className="w-full border-primary/50 hover:bg-primary hover:text-primary-foreground">
              Login
            </Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
