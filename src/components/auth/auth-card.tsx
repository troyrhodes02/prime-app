export function AuthCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm sm:max-w-md sm:p-10">
        <div className="mb-6 text-center">
          <span className="text-xl font-semibold tracking-tight text-gray-900">
            P.R.I.M.E.
          </span>
        </div>
        {children}
      </div>
    </div>
  );
}
