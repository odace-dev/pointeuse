export default function Loading() {
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <img
          src="/logo.svg"
          alt="Chargement..."
          className="h-16 w-auto animate-pulse"
        />
      </div>
    </div>
  );
}
