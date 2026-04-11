'use client';

import { useEffect, useState } from 'react';
import { auth } from '@/firebase';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import LoginScreen from '@/components/LoginScreen';
import Dashboard from '@/components/Dashboard';
import LoadingScreen from '@/components/LoadingScreen';

export default function Home() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) return <LoadingScreen />;
  if (!user) return <LoginScreen />;
  return <Dashboard user={user} onSignOut={() => signOut(auth)} />;
}