export default function AdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-white mb-4">
          Admin Panel
        </h1>
        <p className="text-gray-200 mb-8">
          Manage your database and configure system settings
        </p>
        <div className="bg-white/10 backdrop-blur-sm rounded-lg p-12">
          <div className="text-6xl mb-4">🚧</div>
          <h2 className="text-2xl font-bold text-white mb-4">Coming Soon</h2>
          <p className="text-gray-200">
            Admin panel functionality is currently under development. 
            This will include user management, database administration, and system configuration tools.
          </p>
        </div>
      </div>
    </div>
  );
}
