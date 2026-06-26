type ButtonProps = {
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

export default function Button({ children, variant = "primary" }: ButtonProps) {
  const styles =
    variant === "primary"
      ? "bg-yellow-500 text-black hover:bg-yellow-400"
      : "border border-white/40 text-white hover:bg-white hover:text-black";

  return (
    <button className={`rounded-full px-9 py-4 font-bold transition ${styles}`}>
      {children}
    </button>
  );
}