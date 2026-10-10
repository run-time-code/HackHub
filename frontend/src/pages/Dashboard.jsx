import { useAuth } from "../context/AuthContext";

// Placeholder to prove protected routes + logout work.
// Real Dashboard shell is Week 2 (WA2.W2.T1).
export default function Dashboard() {
  const { user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-2xl">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">
            Welcome, {user?.name || "there"} 👋
          </h1>
          <button
            onClick={logout}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
          >
            Log out
          </button>
        </div>
        <p className="mt-2 text-sm text-gray-600">
          This is a placeholder — the real dashboard is built in Week 2.
        </p>
      </div>
    </div>
  );
}