export function AnimatedBackground() {
  return (
    <div 
      className="fixed inset-0 pointer-events-none z-0"
      style={{
        background: "radial-gradient(ellipse at 30% 30%, rgba(214, 40, 40, 0.08) 0%, rgba(0, 48, 73, 0.05) 50%, transparent 80%)"
      }}
    />
  );
}
