'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/features/auth/AuthContext';
import { useBackground } from '@/components/shared/BackgroundContext';
import { useRouter } from 'next/navigation';

export function SettingsPage() {
  const { user } = useAuth();
  const { background, setBackground } = useBackground();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const backgroundOptions = [
    { value: '/backgrounds/background-1.jpg', label: 'Background 1' },
    { value: '/backgrounds/background-2.jpg', label: 'Background 2' },
    { value: '/backgrounds/background-3.jpg', label: 'Background 3' },
    { value: '/backgrounds/background-4.jpg', label: 'Background 4' },
    { value: '/backgrounds/background-5.jpg', label: 'Background 5' },
    { value: '/backgrounds/background-6.jpg', label: 'Background 6' },
  ];

  const handleBackgroundChange = async (newBackground: string) => {
    setIsLoading(true);
    setMessage('');
    
    try {
      // The BackgroundContext will handle saving to user preferences
      setBackground(newBackground);
      setMessage('Background preference saved!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  // Redirect to homepage if not logged in
  useEffect(() => {
    if (!user) {
      router.push('/');
    }
  }, [user, router]);

  // Don't render anything if not logged in
  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white/10 backdrop-blur-md rounded-lg shadow-lg p-8">
          <h1 className="text-3xl font-bold text-white mb-8">Settings</h1>
          
          {message && (
            <div className="mb-6 p-4 bg-green-500/20 border border-green-500/50 rounded-lg">
              <p className="text-green-200">{message}</p>
            </div>
          )}

          <div className="space-y-8">
            {/* User Info */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Account Information</h2>
              <div className="bg-white/5 rounded-lg p-4 space-y-2">
                <p className="text-white">
                  <span className="font-medium">Username:</span> {user.username}
                </p>
                <p className="text-white">
                  <span className="font-medium">Email:</span> {user.email}
                </p>
                <p className="text-white">
                  <span className="font-medium">Role:</span> 
                  <span className="ml-2 px-2 py-1 bg-blue-600 text-white text-xs rounded-full capitalize">
                    {user.role}
                  </span>
                </p>
                {user.last_login && (
                  <p className="text-white">
                    <span className="font-medium">Last Login:</span> {new Date(user.last_login).toLocaleString()}
                  </p>
                )}
              </div>
            </div>

            {/* Background Preference */}
            <div>
              <h2 className="text-xl font-semibold text-white mb-4">Background Preference</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {backgroundOptions.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleBackgroundChange(option.value)}
                    disabled={isLoading}
                    className={`relative rounded-lg overflow-hidden aspect-video transition-all duration-200 ${
                      background === option.value
                        ? 'ring-4 ring-blue-500 scale-105'
                        : 'hover:scale-105 hover:ring-2 hover:ring-white/50'
                    }`}
                  >
                    <div
                      className="w-full h-full bg-cover bg-center"
                      style={{ backgroundImage: `url(${option.value})` }}
                    />
                    <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">
                        {option.label}
                      </span>
                    </div>
                    {background === option.value && (
                      <div className="absolute top-2 right-2">
                        <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                          <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
