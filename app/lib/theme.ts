// app/lib/theme.ts
export const colorFor = (name: string) => {
  switch (name.toLowerCase()) {
    case "scott":   return { hex: "#3b82f6", twDot: "bg-blue-500",  gFrom:"from-blue-600",   gTo:"to-blue-800" };
    case "ross":    return { hex: "#22c55e", twDot: "bg-green-500", gFrom:"from-green-600",  gTo:"to-green-800" };
    case "douglas": return { hex: "#a855f7", twDot: "bg-purple-500",gFrom:"from-purple-600", gTo:"to-purple-800" };
    case "jake":    return { hex: "#f59e0b", twDot: "bg-orange-500",gFrom:"from-orange-600", gTo:"to-orange-800" };
    default:        return { hex: "#94a3b8", twDot: "bg-slate-400", gFrom:"from-slate-600",  gTo:"to-slate-800" };
  }
};
export const initials = (name: string) =>
  name.split(" ").map(s => s[0]).join("").slice(0,2).toUpperCase();
