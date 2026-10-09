/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User } from './types';
import Landing from './components/Landing';
import Onboarding from './components/Onboarding';
import MainLayout from './components/MainLayout';
import AdminDashboard from './components/AdminDashboard';
import { auth, db } from './lib/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [isAdminMode, setIsAdminMode] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const userData = docSnap.data() as User;
            setUser({ ...userData, uid: firebaseUser.uid, id: firebaseUser.uid });
          } else {
            setUser(null);
          }
        } catch (error) {
          console.error("Error fetching user document:", error);
          setUser(null);
        }
      } else {
        setUser(null);
        setShowOnboarding(false);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-[#121212] text-[#00FF85]">Carregando...</div>;
  }

  if (isAdminMode) {
    return (
      <div className="min-h-screen bg-[#020617] text-slate-200">
        <div className="p-4 border-b border-slate-800 bg-[#090e1a] flex justify-between items-center">
          <img src="/images/direct_cash_pix_logo_1784486102011.jpg" onError={(e) => { (e.currentTarget as HTMLImageElement).src = '/src/assets/images/direct_cash_pix_logo_1784486102011.jpg'; }} alt="Logo" className="h-10 w-auto rounded-lg" />
          <button 
            onClick={() => setIsAdminMode(false)}
            className="text-xs font-bold text-slate-400 hover:text-white bg-slate-850 px-4 py-2 rounded-xl border border-slate-800 hover:bg-slate-800 transition-all cursor-pointer"
          >
            Voltar para o Início
          </button>
        </div>
        <div className="p-4 md:p-8 max-w-6xl mx-auto">
          <AdminDashboard currentUser={user || undefined} />
        </div>
      </div>
    );
  }

  if (!showOnboarding) {
    return <Landing onStart={() => setShowOnboarding(true)} onAdminClick={() => setIsAdminMode(true)} />;
  }

  if (!user || !user.isActive) {
    return <Onboarding onComplete={setUser} initialUser={user} />;
  }

  return <MainLayout user={user} onUserUpdate={setUser} />;
}
