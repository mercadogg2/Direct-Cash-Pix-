import React, { useState, useEffect, useMemo } from 'react';
import { User } from '../types';
import { db, auth, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { 
  collection, query, onSnapshot, doc, updateDoc, deleteDoc, getDocs, getDoc, where, limit, setDoc, serverTimestamp
} from 'firebase/firestore';
import { 
  Shield, Users, Check, X, Lock, Unlock, TrendingUp, Wallet, FileText, 
  Eye, RefreshCw, Search, Filter, ArrowDownRight, AlertCircle, Trash2, 
  Settings, UserCheck, Calendar, Info, Loader2, KeyRound, UserPlus, Pencil,
  Download, Award, Network, ChevronDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell 
} from 'recharts';

interface DBPayment {
  id: string;
  senderId: string;
  senderName?: string;
  senderPixKey?: string;
  receiverId: string;
  receiverName?: string;
  receiverPixKey?: string;
  amount: number;
  level: number;
  status: 'pending' | 'pending_verification' | 'verified';
  receiptImage?: string;
  createdAt?: any;
}

interface DBUser extends User {
  id: string;
}

export default function AdminDashboard({ currentUser }: { currentUser?: User }) {
  // Reactive Firebase User State
  const [activeFirebaseUser, setActiveFirebaseUser] = useState(auth.currentUser);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setActiveFirebaseUser(user);
    });
    return () => unsubscribe();
  }, []);

  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return sessionStorage.getItem('admin_authenticated') === 'true';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [confirmPassword, setConfirmPassword] = useState('');
  const [invitePin, setInvitePin] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [resetSuccess, setResetSuccess] = useState<string | null>(null);

  // Auto-elevate owner/admin and verify administrative Firestore role
  useEffect(() => {
    if (!activeFirebaseUser) {
      setIsAuthenticated(false);
      sessionStorage.removeItem('admin_authenticated');
      return;
    }

    const checkAndElevateAdmin = async () => {
      try {
        const userRef = doc(db, 'users', activeFirebaseUser.uid);
        const docSnap = await getDoc(userRef);
        
        const isOwnerEmail = activeFirebaseUser.email === 'directcashpix@gmail.com' || activeFirebaseUser.email === 'jorjefurtado6@gmail.com';
        const hasAdminRole = docSnap.exists() && (docSnap.data() as User).isAdmin === true;

        if (isOwnerEmail || hasAdminRole) {
          // If it's the owner and their document doesn't have isAdmin, set it
          if (isOwnerEmail && (!docSnap.exists() || !(docSnap.data() as User).isAdmin)) {
            await setDoc(userRef, { 
              uid: activeFirebaseUser.uid,
              name: activeFirebaseUser.displayName || 'Admin',
              email: activeFirebaseUser.email,
              isAdmin: true 
            }, { merge: true });
          }
          
          sessionStorage.setItem('admin_authenticated', 'true');
          setIsAuthenticated(true);
          setAuthError(null);
        } else {
          // KICK OUT unauthorized account, unless they already completed PIN registration/challenge
          const isSessionApproved = sessionStorage.getItem('admin_authenticated') === 'true';
          if (!isSessionApproved) {
            setAuthError(`Acesso negado. A conta ${activeFirebaseUser.email} não possui privilégios de administrador.`);
            setIsAuthenticated(false);
            sessionStorage.removeItem('admin_authenticated');
            await signOut(auth);
          } else {
            setIsAuthenticated(true);
            setAuthError(null);
          }
        }
      } catch (err: any) {
        console.error("Erro ao verificar status admin no Firestore:", err);
        setAuthError(`Erro de verificação: ${err.message || err}`);
      }
    };

    checkAndElevateAdmin();
  }, [activeFirebaseUser]);

  // Firestore Data State
  const [users, setUsers] = useState<DBUser[]>([]);
  const [payments, setPayments] = useState<DBPayment[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters and UI State
  const [activeSubTab, setActiveSubTab] = useState<'metrics' | 'users' | 'payments'>('metrics');
  const [userSearch, setUserSearch] = useState('');
  const [userFilter, setUserFilter] = useState<'all' | 'active' | 'pending'>('all');
  const [userPixTypeFilter, setUserPixTypeFilter] = useState<'all' | 'cpf' | 'email' | 'telefone' | 'aleatoria'>('all');
  const [userRoleFilter, setUserRoleFilter] = useState<'all' | 'admin' | 'user'>('all');
  const [userSortKey, setUserSortKey] = useState<'name' | 'createdAt' | 'referrals'>('createdAt');
  const [userSortOrder, setUserSortOrder] = useState<'asc' | 'desc'>('desc');
  
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'verified'>('all');
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentLevelFilter, setPaymentLevelFilter] = useState<'all' | '1' | '2' | '3' | '4' | '5'>('all');
  const [selectedPayment, setSelectedPayment] = useState<DBPayment | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Form State for New User / Receiver
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserPixKey, setNewUserPixKey] = useState('');
  const [newUserPixType, setNewUserPixType] = useState<'cpf' | 'email' | 'telefone' | 'aleatoria'>('cpf');
  const [newUserIsActive, setNewUserIsActive] = useState(true);
  const [newUserSponsorCode, setNewSponsorCode] = useState('');
  const [newUserInviteCode, setNewUserInviteCode] = useState('');
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);

  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim() || !newUserPixKey.trim()) {
      setCreateUserError('Nome e Chave PIX são obrigatórios.');
      return;
    }

    setCreateUserLoading(true);
    setCreateUserError(null);

    try {
      // Generate inviteCode if not specified
      const inviteCode = newUserInviteCode.trim().toUpperCase() || 
        Math.random().toString(36).substring(2, 10).toUpperCase();

      // Generate a manual receiver user document ID
      const uid = 'man_' + Math.random().toString(36).substring(2, 12);

      const newUserDoc = {
        uid,
        name: newUserName.trim(),
        pixKey: newUserPixKey.trim(),
        pixType: newUserPixType,
        isActive: newUserIsActive,
        inviteCode,
        sponsorCode: newUserSponsorCode.trim() || undefined,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'users', uid), newUserDoc);

      // Reset Form State
      setNewUserName('');
      setNewUserPixKey('');
      setNewUserPixType('cpf');
      setNewUserIsActive(true);
      setNewSponsorCode('');
      setNewUserInviteCode('');
      setShowCreateUserModal(false);
    } catch (err: any) {
      console.error("Erro ao criar usuário recebedor manualmente:", err);
      setCreateUserError(`Erro ao salvar: ${err.message || err}`);
    } finally {
      setCreateUserLoading(false);
    }
  };

  // Form State for Editing User
  const [editingUser, setEditingUser] = useState<DBUser | null>(null);
  const [editUserName, setEditUserName] = useState('');
  const [editUserPixKey, setEditUserPixKey] = useState('');
  const [editUserPixType, setEditUserPixType] = useState<'cpf' | 'email' | 'telefone' | 'aleatoria'>('cpf');
  const [editUserIsActive, setEditUserIsActive] = useState(true);
  const [editUserSponsorCode, setEditUserSponsorCode] = useState('');
  const [editUserInviteCode, setEditUserInviteCode] = useState('');
  const [editUserIsAdmin, setEditUserIsAdmin] = useState(false);
  const [editUserWhatsapp, setEditUserWhatsapp] = useState('');
  const [editUserAllowWhatsappContact, setEditUserAllowWhatsappContact] = useState(true);
  const [editUserLoading, setEditUserLoading] = useState(false);
  const [editUserError, setEditUserError] = useState<string | null>(null);

  const openEditUserModal = (user: DBUser) => {
    setEditingUser(user);
    setEditUserName(user.name || '');
    setEditUserPixKey(user.pixKey || '');
    setEditUserPixType((user.pixType as any) || 'cpf');
    setEditUserIsActive(user.isActive !== false);
    setEditUserSponsorCode(user.sponsorCode || '');
    setEditUserInviteCode(user.inviteCode || '');
    setEditUserIsAdmin(user.isAdmin === true);
    setEditUserWhatsapp(user.whatsapp || '');
    setEditUserAllowWhatsappContact(user.allowWhatsappContact !== false);
    setEditUserError(null);
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    if (!editUserName.trim() || !editUserPixKey.trim()) {
      setEditUserError('Nome e Chave PIX são obrigatórios.');
      return;
    }

    setEditUserLoading(true);
    setEditUserError(null);

    let cleanWhatsapp = editUserWhatsapp.trim().replace(/\D/g, '');
    if (cleanWhatsapp) {
      if ((cleanWhatsapp.length === 10 || cleanWhatsapp.length === 11) && !cleanWhatsapp.startsWith('55')) {
        cleanWhatsapp = '55' + cleanWhatsapp;
      }
    }

    try {
      const userRef = doc(db, 'users', editingUser.id);
      await updateDoc(userRef, {
        name: editUserName.trim(),
        pixKey: editUserPixKey.trim(),
        pixType: editUserPixType,
        isActive: editUserIsActive,
        sponsorCode: editUserSponsorCode.trim() || null,
        inviteCode: editUserInviteCode.trim().toUpperCase() || null,
        isAdmin: editUserIsAdmin,
        whatsapp: cleanWhatsapp,
        allowWhatsappContact: editUserAllowWhatsappContact
      });

      setEditingUser(null);
    } catch (err: any) {
      console.error("Erro ao atualizar usuário pelo admin:", err);
      setEditUserError(`Erro ao salvar alterações: ${err.message || err}`);
    } finally {
      setEditUserLoading(false);
    }
  };

  const handlePasswordReset = async () => {
    if (!email.trim()) {
      setAuthError('Por favor, digite seu e-mail administrativo acima para solicitar o link de redefinição/criação de senha.');
      setResetSuccess(null);
      return;
    }
    setLoginLoading(true);
    setAuthError(null);
    setResetSuccess(null);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setResetSuccess(`E-mail de redefinição de senha enviado com sucesso para: ${email.trim()}. Verifique sua caixa de entrada e pasta de spam.`);
    } catch (err: any) {
      console.error("Erro ao enviar redefinição de senha:", err);
      setAuthError(`Erro ao enviar link de redefinição: ${err.message || err}`);
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Email & Password Admin Auth
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      setAuthError('Por favor, preencha todos os campos.');
      return;
    }

    if (isRegistering) {
      if (password !== confirmPassword) {
        setAuthError('As senhas não coincidem. Por favor, redigite-as.');
        return;
      }
      if (invitePin !== '2026' && invitePin !== 'admin123') {
        setAuthError('Código PIN de convite administrativo inválido. Você deve usar o PIN de administrador oficial para registrar.');
        return;
      }
    }

    setLoginLoading(true);
    setAuthError(null);

    const getFriendlyAuthErrorMessage = (error: any): string => {
      if (!error) return "Erro desconhecido.";
      const code = error.code || error.message || '';
      
      if (code.includes('auth/invalid-credential') || code.includes('wrong-password') || code.includes('user-not-found')) {
        return "E-mail ou senha incorretos. Verifique suas credenciais e tente novamente.";
      }
      if (code.includes('auth/email-already-in-use')) {
        return "Este e-mail já está sendo utilizado por outra conta de administrador.";
      }
      if (code.includes('auth/weak-password')) {
        return "A senha deve conter no mínimo 6 caracteres.";
      }
      if (code.includes('auth/invalid-email')) {
        return "O formato do e-mail inserido é inválido.";
      }
      if (code.includes('auth/user-disabled')) {
        return "Esta conta de administrador foi desativada.";
      }
      if (code.includes('auth/network-request-failed')) {
        return "Erro de conexão. Verifique sua conexão com a internet e tente novamente.";
      }
      if (code.includes('auth/too-many-requests')) {
        return "Acesso temporariamente bloqueado devido a muitas tentativas incorretas. Tente novamente mais tarde.";
      }
      return error.message || String(error);
    };

    try {
      if (isRegistering) {
        // 1. Create user with email and password
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // 2. Set user doc in Firestore
        const userRef = doc(db, 'users', user.uid);
        await setDoc(userRef, { 
          uid: user.uid,
          name: 'Administrador',
          email: user.email,
          isAdmin: true,
          isActive: true
        }, { merge: true });

        sessionStorage.setItem('admin_authenticated', 'true');
        setIsAuthenticated(true);
        setAuthError(null);
        setIsRegistering(false);
      } else {
        // 1. Sign in with email and password
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;

        // 2. Fetch their Firestore user document to verify admin role
        const userRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(userRef);
        
        const isOwnerEmail = user.email === 'jorjefurtado6@gmail.com';
        const hasAdminRole = docSnap.exists() && (docSnap.data() as User).isAdmin === true;

        if (isOwnerEmail || hasAdminRole) {
          // Automatically create or update the user doc for the owner if it doesn't exist
          if (isOwnerEmail && (!docSnap.exists() || !(docSnap.data() as User).isAdmin)) {
            await setDoc(userRef, { 
              uid: user.uid,
              name: user.displayName || 'Admin',
              email: user.email,
              isAdmin: true 
            }, { merge: true });
          }

          sessionStorage.setItem('admin_authenticated', 'true');
          setIsAuthenticated(true);
          setAuthError(null);
        } else {
          setAuthError(`Acesso negado. A conta ${user.email} não possui privilégios de administrador.`);
          setIsAuthenticated(false);
          sessionStorage.removeItem('admin_authenticated');
          await signOut(auth);
        }
      }
    } catch (err: any) {
      console.error("Erro ao autenticar administrador:", err);
      setAuthError(getFriendlyAuthErrorMessage(err));
    } finally {
      setLoginLoading(false);
    }
  };

  // Realtime lists of Users and Payments
  useEffect(() => {
    if (!isAuthenticated || !activeFirebaseUser) {
      if (!isAuthenticated) {
        setLoading(false);
      } else {
        setLoading(true);
      }
      return;
    }

    setLoading(true);

    // Stream Users
    const qUsers = query(collection(db, 'users'));
    const unsubUsers = onSnapshot(qUsers, (snapshot) => {
      const uList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DBUser[];
      
      // Sort users by creation date
      uList.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setUsers(uList);
    }, (err) => {
      console.error("Erro ao transmitir usuários no painel admin:", err);
      handleFirestoreError(err, OperationType.GET, 'users');
    });

    // Stream Payments
    const qPayments = query(collection(db, 'payments'));
    const unsubPayments = onSnapshot(qPayments, (snapshot) => {
      const pList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as DBPayment[];
      
      // Sort payments by creation date
      pList.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
      setPayments(pList);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao transmitir pagamentos no painel admin:", err);
      setLoading(false);
      handleFirestoreError(err, OperationType.GET, 'payments');
    });

    return () => {
      unsubUsers();
      unsubPayments();
    };
  }, [isAuthenticated, activeFirebaseUser]);

  // Activate / Deactivate User manually
  const toggleUserStatus = async (userDocId: string, currentStatus: boolean) => {
    setActionLoading(userDocId);
    try {
      const userRef = doc(db, 'users', userDocId);
      await updateDoc(userRef, {
        isActive: !currentStatus
      });
    } catch (err) {
      console.error("Erro ao alterar status do usuário:", err);
      alert("Erro de permissão ou rede ao atualizar usuário.");
    } finally {
      setActionLoading(null);
    }
  };

  // Approve payment & automatically activate user account
  const approvePayment = async (payment: DBPayment) => {
    setActionLoading(payment.id);
    try {
      // 1. Update Payment Status to verified
      const paymentRef = doc(db, 'payments', payment.id);
      await updateDoc(paymentRef, {
        status: 'verified'
      });

      // 2. Automatically update associated sender's user account to isActive = true
      if (payment.senderId) {
        // Find user with senderId as doc ID (in Firebase, user documents match their Auth UID)
        const userRef = doc(db, 'users', payment.senderId);
        await updateDoc(userRef, {
          isActive: true
        });
      }

      // Sync local selection if open in modal
      if (selectedPayment?.id === payment.id) {
        setSelectedPayment({ ...payment, status: 'verified' });
      }
    } catch (err) {
      console.error("Erro ao aprovar doação:", err);
      alert("Erro ao aprovar doação. Verifique as regras de segurança.");
    } finally {
      setActionLoading(null);
    }
  };

  // Reject / Delete Payment entry
  const deletePaymentEntry = async (paymentId: string) => {
    if (!confirm("Tem certeza que deseja excluir este registro de doação?")) return;
    
    setActionLoading(paymentId);
    try {
      await deleteDoc(doc(db, 'payments', paymentId));
      if (selectedPayment?.id === paymentId) {
        setSelectedPayment(null);
      }
    } catch (err) {
      console.error("Erro ao deletar doação:", err);
      alert("Erro ao remover registro.");
    } finally {
      setActionLoading(null);
    }
  };

  // Delete User Account
  const deleteUserAccount = async (userId: string, name: string) => {
    if (!confirm(`Deseja realmente EXCLUIR permanentemente a conta de "${name}"? Esta ação removerá o usuário e não pode ser desfeita.`)) return;
    
    setActionLoading(userId);
    try {
      await deleteDoc(doc(db, 'users', userId));
      if (editingUser?.id === userId) {
        setEditingUser(null);
        setEditUserError(null);
      }
    } catch (err: any) {
      console.error("Erro ao deletar conta do usuário:", err);
      alert(`Erro ao remover usuário: ${err.message || err}`);
    } finally {
      setActionLoading(null);
    }
  };

  // Helper formatting functions
  const formatDate = (timestamp: any) => {
    if (!timestamp) return 'Recente';
    const d = new Date(timestamp.seconds * 1000);
    return d.toLocaleString('pt-BR');
  };

  // Metrics Calculations
  const totalUsersCount = users.length;
  const activeUsersCount = users.filter(u => u.isActive).length;
  const pendingUsersCount = totalUsersCount - activeUsersCount;
  
  const verifiedPayments = useMemo(() => payments.filter(p => p.status === 'verified'), [payments]);
  const pendingVerificationCount = useMemo(() => payments.filter(p => p.status === 'pending_verification').length, [payments]);
  const totalVolumeTransacted = useMemo(() => verifiedPayments.reduce((acc, p) => acc + (p.amount || 10), 0), [verifiedPayments]);

  // Map to count how many referrals each sponsor code has
  const referralsCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    users.forEach(u => {
      if (u.sponsorCode) {
        map[u.sponsorCode] = (map[u.sponsorCode] || 0) + 1;
      }
    });
    return map;
  }, [users]);

  // List of top promoters / sponsors
  const topSponsors = useMemo(() => {
    const sponsorsList = users.filter(u => u.inviteCode);
    const sponsorsWithCount = sponsorsList.map(u => ({
      ...u,
      count: referralsCountMap[u.inviteCode!] || 0
    })).filter(item => item.count > 0);
    
    sponsorsWithCount.sort((a, b) => b.count - a.count);
    return sponsorsWithCount.slice(0, 5); // top 5
  }, [users, referralsCountMap]);

  // Registrations over the last 7 days
  const dailyRegistrations = useMemo(() => {
    const groups: Record<string, { date: string; total: number; active: number }> = {};
    
    // Fill in the last 7 days with zero values so the chart is never blank
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      groups[dateStr] = { date: dateStr, total: 0, active: 0 };
    }
    
    // Populate with real data
    users.forEach(u => {
      if (!u.createdAt) return;
      const date = new Date(u.createdAt.seconds * 1000);
      const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      
      if (groups[dateStr]) {
        groups[dateStr].total += 1;
        if (u.isActive) {
          groups[dateStr].active += 1;
        }
      }
    });
    
    return Object.values(groups);
  }, [users]);

  // Payments by Level structure for Recharts
  const paymentsByLevel = useMemo(() => {
    const levelCounts = [0, 0, 0, 0, 0];
    verifiedPayments.forEach(p => {
      const lvl = p.level || 1;
      if (lvl >= 1 && lvl <= 5) {
        levelCounts[lvl - 1] += p.amount || 10;
      }
    });
    return levelCounts.map((val, idx) => ({
      name: `Lvl ${idx + 1}`,
      Volume: val,
    }));
  }, [verifiedPayments]);

  // PIX Key Distribution structure for cards
  const pixTypeDistribution = useMemo(() => {
    const counts: Record<string, number> = { cpf: 0, email: 0, telefone: 0, aleatoria: 0 };
    users.forEach(u => {
      const type = u.pixType || 'cpf';
      if (type in counts) {
        counts[type] += 1;
      } else {
        counts['cpf'] += 1;
      }
    });
    
    return [
      { name: 'CPF', value: counts.cpf },
      { name: 'E-mail', value: counts.email },
      { name: 'Telefone', value: counts.telefone },
      { name: 'Chave Aleatória', value: counts.aleatoria }
    ].filter(item => item.value > 0);
  }, [users]);

  // User list filter/search logic
  const filteredUsers = useMemo(() => {
    return users.filter(u => {
      const emailMatch = u.email && u.email.toLowerCase().includes(userSearch.toLowerCase());
      const matchesSearch = u.name.toLowerCase().includes(userSearch.toLowerCase()) || 
                            u.pixKey.includes(userSearch) || 
                            (u.inviteCode && u.inviteCode.toLowerCase().includes(userSearch.toLowerCase())) ||
                            emailMatch;
      
      const matchesStatus = 
        userFilter === 'all' ? true :
        userFilter === 'active' ? u.isActive : !u.isActive;
        
      const matchesPixType =
        userPixTypeFilter === 'all' ? true :
        u.pixType === userPixTypeFilter;
        
      const matchesRole =
        userRoleFilter === 'all' ? true :
        userRoleFilter === 'admin' ? u.isAdmin === true : u.isAdmin !== true;
        
      return matchesSearch && matchesStatus && matchesPixType && matchesRole;
    });
  }, [users, userSearch, userFilter, userPixTypeFilter, userRoleFilter]);

  // Sorted list of filtered users
  const sortedFilteredUsers = useMemo(() => {
    const result = [...filteredUsers];
    result.sort((a, b) => {
      if (userSortKey === 'name') {
        return userSortOrder === 'asc' 
          ? a.name.localeCompare(b.name) 
          : b.name.localeCompare(a.name);
      } else if (userSortKey === 'createdAt') {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return userSortOrder === 'asc' ? timeA - timeB : timeB - timeA;
      } else if (userSortKey === 'referrals') {
        const countA = referralsCountMap[a.inviteCode || ''] || 0;
        const countB = referralsCountMap[b.inviteCode || ''] || 0;
        return userSortOrder === 'asc' ? countA - countB : countB - countA;
      }
      return 0;
    });
    return result;
  }, [filteredUsers, userSortKey, userSortOrder, referralsCountMap]);

  // Payment list filter logic
  const filteredPayments = useMemo(() => {
    return payments.filter(p => {
      const searchStr = paymentSearch.toLowerCase();
      const matchesSearch = 
        (p.senderName && p.senderName.toLowerCase().includes(searchStr)) ||
        (p.senderPixKey && p.senderPixKey.includes(paymentSearch)) ||
        (p.receiverName && p.receiverName.toLowerCase().includes(searchStr)) ||
        (p.receiverPixKey && p.receiverPixKey.includes(paymentSearch)) ||
        p.id.toLowerCase().includes(searchStr);
        
      const matchesStatus = 
        paymentFilter === 'all' ? true :
        paymentFilter === 'pending' ? p.status === 'pending_verification' : p.status === 'verified';
        
      const matchesLevel =
        paymentLevelFilter === 'all' ? true :
        p.level === parseInt(paymentLevelFilter);
        
      return matchesSearch && matchesStatus && matchesLevel;
    });
  }, [payments, paymentSearch, paymentFilter, paymentLevelFilter]);

  // CSV Export for Users
  const exportUsersToCSV = () => {
    const headers = ['ID', 'Nome', 'Email', 'Chave PIX', 'Tipo PIX', 'Codigo Convite', 'Codigo Indicador', 'Referidos Diretos', 'Status', 'Criado Em'];
    const rows = sortedFilteredUsers.map(u => [
      u.id || u.uid,
      u.name,
      u.email || '',
      u.pixKey,
      u.pixType,
      u.inviteCode || '',
      u.sponsorCode || '',
      referralsCountMap[u.inviteCode || ''] || 0,
      u.isActive ? 'Ativo' : 'Pendente',
      formatDate(u.createdAt)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(';'), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `directcash_usuarios_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Payments
  const exportPaymentsToCSV = () => {
    const headers = ['ID Transacao', 'Doador ID', 'Doador Nome', 'Chave Doador', 'Destinatario Nome', 'Chave Destinatario', 'Level', 'Valor (R$)', 'Status', 'Data'];
    const rows = filteredPayments.map(p => [
      p.id,
      p.senderId,
      p.senderName || '',
      p.senderPixKey || '',
      p.receiverName || '',
      p.receiverPixKey || '',
      p.level,
      p.amount || 10,
      p.status === 'verified' ? 'Confirmado' : p.status === 'pending_verification' ? 'Pendente' : 'Pendente',
      formatDate(p.createdAt)
    ]);
    
    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(';'), ...rows.map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))].join('\n');
      
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `directcash_doacoes_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Gate Screen (Not authenticated)
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto my-12 bg-slate-900/50 border border-slate-800 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-10 -right-10 w-32 h-32 bg-[#32BCAD]/10 rounded-full blur-2xl pointer-events-none"></div>
        
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-[#32BCAD]/10 border border-[#32BCAD]/20 text-[#32BCAD] rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(50,188,173,0.15)]">
            {isRegistering ? <UserPlus size={32} /> : <Lock size={32} />}
          </div>
          <h3 className="text-xl font-bold text-white tracking-tight">
            {isRegistering ? "Registro de Administrador" : "Painel do Administrador"}
          </h3>
          <p className="text-slate-400 text-xs mt-1.5">
            {isRegistering 
              ? "Crie uma nova conta com e-mail, senha e PIN" 
              : "Insira seu e-mail e senha de acesso"}
          </p>
        </div>

        <form onSubmit={handleAuthSubmit} className="space-y-5">
          {/* Email input */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">E-mail Administrativo</label>
            <div className="relative">
              <input 
                type="email" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@exemplo.com"
                disabled={loginLoading}
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] disabled:opacity-50 text-white text-xs py-3 px-4 pl-11 rounded-xl outline-none transition-all placeholder:text-slate-700"
                autoFocus
                required
              />
              <FileText className="absolute left-4 top-3.5 text-slate-700" size={16} />
            </div>
          </div>

          {/* Password input */}
          <div className="space-y-2">
            <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Senha de Acesso</label>
            <div className="relative">
              <input 
                type="password" 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                disabled={loginLoading}
                className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] disabled:opacity-50 text-white text-xs py-3 px-4 pl-11 rounded-xl outline-none transition-all placeholder:text-slate-700"
                required
              />
              <KeyRound className="absolute left-4 top-3.5 text-slate-700" size={16} />
            </div>
          </div>

          {/* Registration specific fields */}
          {isRegistering && (
            <>
              {/* Confirm Password input */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">Confirmar Senha</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    disabled={loginLoading}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] disabled:opacity-50 text-white text-xs py-3 px-4 pl-11 rounded-xl outline-none transition-all placeholder:text-slate-700"
                    required
                  />
                  <KeyRound className="absolute left-4 top-3.5 text-slate-700" size={16} />
                </div>
              </div>

              {/* Invite PIN input */}
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block">PIN de Convite de Administrador</label>
                <div className="relative">
                  <input 
                    type="password" 
                    value={invitePin}
                    onChange={(e) => setInvitePin(e.target.value)}
                    placeholder="Digite o PIN (ex: 2026)"
                    disabled={loginLoading}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] disabled:opacity-50 text-white text-xs py-3 px-4 pl-11 rounded-xl outline-none transition-all placeholder:text-slate-700"
                    required
                  />
                  <Shield className="absolute left-4 top-3.5 text-slate-700" size={16} />
                </div>
              </div>
            </>
          )}

          {authError && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-4 rounded-xl flex gap-2.5 items-start">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <p className="font-medium leading-relaxed">{authError}</p>
            </div>
          )}

          {resetSuccess && (
            <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs p-4 rounded-xl flex gap-2.5 items-start">
              <Check size={16} className="shrink-0 mt-0.5 text-emerald-400" />
              <p className="font-medium leading-relaxed">{resetSuccess}</p>
            </div>
          )}

          <button 
            type="submit"
            disabled={loginLoading}
            className="w-full bg-[#32BCAD] hover:bg-[#269689] text-slate-900 font-bold uppercase tracking-widest text-xs py-4 rounded-xl cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_0_15px_rgba(50,188,173,0.2)] transition-all flex items-center justify-center gap-2"
          >
            {loginLoading ? (
              <>
                <Loader2 size={14} className="animate-spin stroke-[3]" /> Processando...
              </>
            ) : isRegistering ? (
              <>
                <UserPlus size={14} className="stroke-[3]" /> Criar Conta Admin
              </>
            ) : (
              <>
                <Unlock size={14} className="stroke-[3]" /> Acessar Painel
              </>
            )}
          </button>
        </form>

        <div className="mt-6 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              setIsRegistering(!isRegistering);
              setAuthError(null);
              setResetSuccess(null);
              setConfirmPassword('');
              setInvitePin('');
            }}
            className="text-[#32BCAD] hover:text-[#269689] text-xs font-bold transition-all"
          >
            {isRegistering ? "← Voltar para o Login" : "Criar nova conta de administrador"}
          </button>

          {!isRegistering && (
            <button
              type="button"
              onClick={handlePasswordReset}
              disabled={loginLoading}
              className="text-slate-500 hover:text-slate-300 text-[11px] transition-all underline decoration-dotted underline-offset-4"
            >
              Definir ou recuperar senha? Enviar link para o e-mail inserido acima
            </button>
          )}
        </div>

        <div className="mt-8 border-t border-slate-800/80 pt-5 text-center text-[10px] text-slate-500 uppercase tracking-widest font-bold">
          <Info className="inline mr-1 -mt-0.5" size={12} />
          {isRegistering ? "Código PIN de administrador padrão: 2026" : "Área restrita a administradores autorizados."}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">

      {/* Admin Session Info Bar */}
      <div className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#32BCAD]/10 border border-[#32BCAD]/20 text-[#32BCAD] rounded-xl flex items-center justify-center">
            <Shield size={20} />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white">Sessão Administrativa Ativa</h4>
            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{activeFirebaseUser?.email}</p>
          </div>
        </div>
        <button
          onClick={async () => {
            sessionStorage.removeItem('admin_authenticated');
            setIsAuthenticated(false);
            await signOut(auth);
          }}
          className="text-[10px] font-bold text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 border border-red-500/20 rounded-xl transition-all cursor-pointer flex items-center gap-2"
        >
          <Lock size={12} /> Sair do Painel
        </button>
      </div>
      
      {/* Sub Tabs Bar */}
      <div className="flex flex-wrap bg-slate-950/60 p-1.5 rounded-2xl border border-slate-800/85 gap-1.5">
        {[
          { id: 'metrics', label: 'Estatísticas Globais', icon: TrendingUp },
          { id: 'users', label: 'Usuários Cadastrados', icon: Users, badge: pendingUsersCount > 0 ? pendingUsersCount : undefined },
          { id: 'payments', label: 'Doações & Comprovantes', icon: FileText, badge: pendingVerificationCount > 0 ? pendingVerificationCount : undefined }
        ].map((subTab) => {
          const Icon = subTab.icon;
          const isActive = activeSubTab === subTab.id;
          return (
            <button
              key={subTab.id}
              onClick={() => setActiveSubTab(subTab.id as any)}
              className={`flex-1 sm:flex-none px-5 py-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                isActive ? 'bg-[#32BCAD] text-slate-900 shadow-[0_0_15px_rgba(50,188,173,0.25)]' : 'text-slate-400 hover:text-white hover:bg-slate-900/40'
              }`}
            >
              <Icon size={14} />
              {subTab.label}
              {subTab.badge && (
                <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${isActive ? 'bg-slate-900 text-[#32BCAD]' : 'bg-red-500/20 text-red-400 border border-red-500/30'}`}>
                  {subTab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* METRICS VIEW */}
      {activeSubTab === 'metrics' && (
        <div className="space-y-6">
          {/* Main Stats Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { 
                title: 'Total de Usuários', 
                value: totalUsersCount, 
                desc: `${activeUsersCount} ativos • ${pendingUsersCount} pendentes`,
                icon: Users, 
                color: 'text-[#32BCAD]', 
                bg: 'bg-[#32BCAD]/10' 
              },
              { 
                title: 'Volume de Doações', 
                value: `R$ ${totalVolumeTransacted.toFixed(2).replace('.', ',')}`, 
                desc: `${verifiedPayments.length} transações verificadas`,
                icon: Wallet, 
                color: 'text-emerald-400', 
                bg: 'bg-emerald-400/10' 
              },
              { 
                title: 'Pendentes de Análise', 
                value: pendingVerificationCount, 
                desc: pendingVerificationCount > 0 ? 'Ação administrativa recomendada' : 'Sem pendências',
                icon: Shield, 
                color: pendingVerificationCount > 0 ? 'text-amber-400' : 'text-slate-400', 
                bg: pendingVerificationCount > 0 ? 'bg-amber-400/10' : 'bg-slate-800/20' 
              },
              { 
                title: 'Taxa de Conversão', 
                value: totalUsersCount > 0 ? `${Math.round((activeUsersCount / totalUsersCount) * 100)}%` : '0%', 
                desc: 'Membros Ativos / Cadastrados',
                icon: TrendingUp, 
                color: 'text-purple-400', 
                bg: 'bg-purple-400/10' 
              },
            ].map((stat, i) => (
              <div key={i} className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 hover:border-slate-750 transition-colors">
                <div className="flex items-center justify-between mb-4">
                  <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                    <stat.icon size={22} />
                  </div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Sincronizado</span>
                </div>
                <h4 className="text-2xl font-black text-white tracking-tight">{stat.value}</h4>
                <p className="text-xs text-slate-300 font-bold mt-1.5">{stat.title}</p>
                <p className="text-[10px] text-slate-500 mt-0.5">{stat.desc}</p>
              </div>
            ))}
          </div>

          {/* Charts Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Registration History Chart */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 h-[320px] flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white tracking-tight mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={14} className="text-[#32BCAD]" /> Histórico de Registros (7 Dias)
                </h4>
                <p className="text-[10px] text-slate-500 mb-4">Acompanhamento diário de novos registros e membros ativados</p>
              </div>
              <div className="flex-1 min-h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyRegistrations} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#32BCAD" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#32BCAD" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorActive" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="date" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} allowDecimals={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ fontSize: '11px', color: '#fff' }}
                    />
                    <Area type="monotone" dataKey="total" name="Cadastrados" stroke="#32BCAD" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                    <Area type="monotone" dataKey="active" name="Ativos" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#colorActive)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Donation Level Volume Chart */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 h-[320px] flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white tracking-tight mb-2 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={14} className="text-emerald-400" /> Fluxo Financeiro por Nível
                </h4>
                <p className="text-[10px] text-slate-500 mb-4">Volume monetário compensado (em R$) por cada nível de indicação</p>
              </div>
              <div className="flex-1 min-h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentsByLevel} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis dataKey="name" stroke="#64748b" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748b" fontSize={9} tickLine={false} unit="R$" />
                    <Tooltip 
                      formatter={(value: any) => [`R$ ${value},00`, 'Volume']}
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '12px' }}
                      labelStyle={{ color: '#94a3b8', fontSize: '10px', fontWeight: 'bold' }}
                      itemStyle={{ fontSize: '11px', color: '#fff' }}
                    />
                    <Bar dataKey="Volume" fill="#10B981" radius={[4, 4, 0, 0]}>
                      {paymentsByLevel.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#10B981' : '#32BCAD'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Leaders & Pix Key Breakdown Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Recruiters Leaders Card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 lg:col-span-2">
              <h4 className="font-bold text-white tracking-tight mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                <Award size={16} className="text-[#32BCAD]" /> Líderes de Indicações (Top 5)
              </h4>
              {topSponsors.length === 0 ? (
                <div className="text-center py-12 text-slate-500 text-xs">
                  Nenhuma indicação ativa registrada na rede ainda.
                </div>
              ) : (
                <div className="space-y-3.5">
                  {topSponsors.map((sponsor, index) => (
                    <div key={sponsor.id} className="flex items-center justify-between p-3 bg-slate-950/40 border border-slate-850 rounded-xl hover:border-slate-800 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs ${
                          index === 0 ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                          index === 1 ? 'bg-slate-300/10 text-slate-300 border border-slate-300/20' :
                          index === 2 ? 'bg-amber-700/10 text-amber-700 border border-amber-700/20' :
                          'bg-slate-800 text-slate-400'
                        }`}>
                          #{index + 1}
                        </div>
                        <div>
                          <div className="font-bold text-white text-xs">{sponsor.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Código: {sponsor.inviteCode}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-xs bg-[#32BCAD]/10 border border-[#32BCAD]/20 text-[#32BCAD] px-2.5 py-1 rounded-full font-bold">
                          {sponsor.count} {sponsor.count === 1 ? 'indicado' : 'indicados'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* PIX Key Distribution Card */}
            <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-5 flex flex-col justify-between">
              <div>
                <h4 className="font-bold text-white tracking-tight mb-4 flex items-center gap-2 text-xs uppercase tracking-wider">
                  <Wallet size={16} className="text-purple-400" /> Distribuição de Chaves PIX
                </h4>
                {pixTypeDistribution.length === 0 ? (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    Nenhum dado disponível.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {/* Visual Progress Bar list for each key type */}
                    {['CPF', 'E-mail', 'Telefone', 'Chave Aleatória'].map((typeName) => {
                      const distItem = pixTypeDistribution.find(d => d.name === typeName || (typeName === 'Chave Aleatória' && d.name === 'Aleatória'));
                      const count = distItem ? distItem.value : 0;
                      const percentage = totalUsersCount > 0 ? Math.round((count / totalUsersCount) * 100) : 0;
                      const colorClass = 
                        typeName === 'CPF' ? 'bg-[#32BCAD]' :
                        typeName === 'E-mail' ? 'bg-purple-500' :
                        typeName === 'Telefone' ? 'bg-amber-500' : 'bg-emerald-500';
                      
                      return (
                        <div key={typeName} className="space-y-1.5">
                          <div className="flex justify-between text-[11px] font-bold">
                            <span className="text-slate-300">{typeName}</span>
                            <span className="text-slate-400">{count} ({percentage}%)</span>
                          </div>
                          <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden border border-slate-850">
                            <div className={`h-full ${colorClass}`} style={{ width: `${percentage}%` }}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-slate-500 mt-5 leading-normal">
                Análise de conformidade de chaves financeiras cadastradas no sistema.
              </p>
            </div>
          </div>

          {/* Quick Informational Box */}
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-6">
            <h4 className="font-bold text-white tracking-tight mb-2 flex items-center gap-2">
              <Info size={16} className="text-[#32BCAD]" /> Manual de Procedimento Administrativo
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Como administrador do <strong>Direct Cash Pix</strong>, você tem controle total sobre o fluxo de ativação dos membros. O sistema opera de forma descentralizada baseada em doações voluntárias P2P de <strong>R$ 10,00</strong> por nível (totalizando R$ 50,00 de doações na ativação de cada usuário).
            </p>
            <ul className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 text-[11px] text-slate-500">
              <li className="flex gap-2">
                <span className="text-[#32BCAD] font-bold">1.</span>
                <span>Os novos usuários enviam comprovantes de PIX anexando imagens reais ou simuladas das transações de R$ 10,00.</span>
              </li>
              <li className="flex gap-2">
                <span className="text-[#32BCAD] font-bold">2.</span>
                <span>No menu <strong>"Doações"</strong>, você visualiza o comprovante em tempo real e clica em "Confirmar" para aprovar e ativar o respectivo remetente.</span>
              </li>
            </ul>
          </div>
        </div>
      )}

      {/* USERS LIST VIEW */}
      {activeSubTab === 'users' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <input 
                type="text" 
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Pesquisar por nome, email, chave PIX ou código..." 
                className="w-full bg-slate-950 border border-slate-800/80 focus:border-[#32BCAD] text-xs text-white pl-10 pr-4 py-3 rounded-xl outline-none transition-all placeholder:text-slate-600"
              />
              <Search className="absolute left-3.5 top-3.5 text-slate-600" size={15} />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Status Filter */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'active', label: 'Ativos' },
                  { id: 'pending', label: 'Pendentes' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setUserFilter(btn.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                      userFilter === btn.id ? 'bg-[#32BCAD] text-slate-900' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Export to CSV */}
              <button
                onClick={exportUsersToCSV}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Exportar dados para Excel/CSV"
              >
                <Download size={14} />
                <span className="hidden sm:inline">Exportar CSV</span>
              </button>

              {/* Create User Button */}
              <button
                onClick={() => setShowCreateUserModal(true)}
                className="bg-[#32BCAD] hover:bg-[#269689] text-slate-900 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(50,188,173,0.15)]"
              >
                <UserPlus size={14} />
                <span>Novo Recebedor</span>
              </button>
            </div>
          </div>

          {/* Advanced Multi-Filters Panel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-slate-950/40 border border-slate-850 rounded-xl">
            {/* PIX Type filter */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Filtrar por Tipo PIX</label>
              <div className="relative">
                <select
                  value={userPixTypeFilter}
                  onChange={(e) => setUserPixTypeFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs py-2.5 px-3 rounded-lg appearance-none outline-none focus:border-[#32BCAD]"
                >
                  <option value="all">Todos os tipos</option>
                  <option value="cpf">CPF</option>
                  <option value="email">E-mail</option>
                  <option value="telefone">Telefone</option>
                  <option value="aleatoria">Chave Aleatória</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3 text-slate-600 pointer-events-none" size={13} />
              </div>
            </div>

            {/* Role Filter */}
            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Filtrar por Função</label>
              <div className="relative">
                <select
                  value={userRoleFilter}
                  onChange={(e) => setUserRoleFilter(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs py-2.5 px-3 rounded-lg appearance-none outline-none focus:border-[#32BCAD]"
                >
                  <option value="all">Todas as funções</option>
                  <option value="admin">Administradores</option>
                  <option value="user">Usuários Comuns</option>
                </select>
                <ChevronDown className="absolute right-2.5 top-3 text-slate-600 pointer-events-none" size={13} />
              </div>
            </div>

            {/* Sorting selector */}
            <div className="space-y-1 sm:col-span-2 md:col-span-1">
              <label className="text-[10px] text-slate-500 uppercase tracking-wider font-bold block">Classificar por</label>
              <div className="flex gap-1.5">
                <select
                  value={userSortKey}
                  onChange={(e) => setUserSortKey(e.target.value as any)}
                  className="flex-1 bg-slate-950 border border-slate-800 text-slate-300 text-xs py-2.5 px-3 rounded-lg outline-none focus:border-[#32BCAD]"
                >
                  <option value="createdAt">Data de Criação</option>
                  <option value="name">Nome (A-Z)</option>
                  <option value="referrals">Indicações Diretas</option>
                </select>
                <button
                  onClick={() => setUserSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
                  className="bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white px-3 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                  title={userSortOrder === 'asc' ? 'Ordem Crescente' : 'Ordem Decrescente'}
                >
                  {userSortOrder === 'asc' ? <ChevronDown size={14} className="rotate-180 transition-transform" /> : <ChevronDown size={14} />}
                </button>
              </div>
            </div>
          </div>

          {/* Users Table / Mobile List */}
          {sortedFilteredUsers.length === 0 ? (
            <div className="text-center py-16 bg-slate-950/20 rounded-xl border border-slate-850/50 flex flex-col items-center justify-center gap-2">
              <Users size={28} className="text-slate-600" />
              <p className="text-slate-400 text-xs font-bold">Nenhum usuário encontrado</p>
              <p className="text-[10px] text-slate-500">Tente ajustar seus termos de pesquisa ou filtros.</p>
            </div>
          ) : (
            <div className="overflow-x-auto border border-slate-850 rounded-xl bg-slate-950/20">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-slate-850 text-[10px] text-slate-500 uppercase font-black tracking-wider bg-slate-900/30">
                    <th 
                      onClick={() => {
                        if (userSortKey === 'name') {
                          setUserSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setUserSortKey('name');
                          setUserSortOrder('asc');
                        }
                      }}
                      className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        Membro
                        {userSortKey === 'name' && (userSortOrder === 'asc' ? <ChevronDown size={10} className="rotate-180" /> : <ChevronDown size={10} />)}
                      </div>
                    </th>
                    <th className="py-4 px-5">Código / Patrocinador</th>
                    <th className="py-4 px-5">Dados PIX</th>
                    <th 
                      onClick={() => {
                        if (userSortKey === 'createdAt') {
                          setUserSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                        } else {
                          setUserSortKey('createdAt');
                          setUserSortOrder('desc');
                        }
                      }}
                      className="py-4 px-5 cursor-pointer hover:text-white transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        Criado Em
                        {userSortKey === 'createdAt' && (userSortOrder === 'asc' ? <ChevronDown size={10} className="rotate-180" /> : <ChevronDown size={10} />)}
                      </div>
                    </th>
                    <th className="py-4 px-5">Status</th>
                    <th className="py-4 px-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-850 text-xs">
                  {sortedFilteredUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-slate-900/20 transition-colors">
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center font-bold text-xs shrink-0 border border-slate-700/35">
                            {u.name.substring(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-white tracking-wide">{u.name}</span>
                              {u.isAdmin && (
                                <span className="px-1.5 py-0.5 rounded text-[8px] bg-[#32BCAD]/10 text-[#32BCAD] border border-[#32BCAD]/20 font-black uppercase tracking-wider">
                                  Admin
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5 font-mono select-all">{u.uid || u.id}</div>
                            {u.email && (
                              <div className="text-[9px] text-slate-600 font-mono select-all truncate max-w-[150px]">{u.email}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="font-bold font-mono text-[#32BCAD]">Cód: {u.inviteCode || 'N/A'}</div>
                          <div className="text-[10px] text-slate-500 font-mono">Ind: {u.sponsorCode || 'Sem patrocinador'}</div>
                          <div className="text-[9px] text-slate-400 font-bold">
                            Indicados diretos: {referralsCountMap[u.inviteCode || ''] || 0}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-5">
                        <div className="space-y-1">
                          <div className="font-mono text-slate-200 select-all">{u.pixKey}</div>
                          <div className="text-[10px] text-slate-500 uppercase font-black tracking-widest">{u.pixType}</div>
                        </div>
                      </td>
                      <td className="py-4 px-5 text-slate-400 font-mono">
                        {formatDate(u.createdAt)}
                      </td>
                      <td className="py-4 px-5">
                        {u.isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-bold text-[9px] uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                            Ativo
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 font-bold text-[9px] uppercase tracking-wider">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
                            Pendente
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => openEditUserModal(u)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#32BCAD] hover:bg-[#32BCAD]/10 border border-transparent transition-all cursor-pointer"
                            title="Editar Dados"
                          >
                            <Pencil size={13} />
                          </button>
                          
                          <button
                            onClick={() => toggleUserStatus(u.id, u.isActive)}
                            disabled={actionLoading === u.id}
                            className={`px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                              u.isActive 
                                ? 'bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20'
                            }`}
                            title={u.isActive ? "Desativar Membro" : "Ativar Membro"}
                          >
                            {actionLoading === u.id ? (
                              <Loader2 className="animate-spin text-center inline" size={11} />
                            ) : u.isActive ? (
                              'Desativar'
                            ) : (
                              'Ativar'
                            )}
                          </button>

                          <button
                            onClick={() => deleteUserAccount(u.id, u.name)}
                            disabled={actionLoading === u.id}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent transition-all cursor-pointer"
                            title="Excluir Usuário"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* PAYMENTS VERIFICATION VIEW */}
      {activeSubTab === 'payments' && (
        <div className="bg-slate-900/40 border border-slate-800 rounded-2xl p-6 space-y-5">
          <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
              <FileText size={14} className="text-[#32BCAD]" /> Fluxo de Comprovantes Recebidos
            </h4>

            <div className="flex flex-wrap items-center gap-3">
              {/* Filter buttons */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 shrink-0">
                {[
                  { id: 'all', label: 'Todos' },
                  { id: 'pending', label: 'Para Analisar' },
                  { id: 'verified', label: 'Verificados' }
                ].map((btn) => (
                  <button
                    key={btn.id}
                    onClick={() => setPaymentFilter(btn.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      paymentFilter === btn.id ? 'bg-[#32BCAD] text-slate-900' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>

              {/* Export Payments CSV */}
              <button
                onClick={exportPaymentsToCSV}
                className="bg-slate-950 border border-slate-800 hover:border-slate-700 hover:bg-slate-900 text-slate-300 font-bold text-xs px-4 py-2.5 rounded-xl transition-all flex items-center gap-1.5 cursor-pointer"
                title="Exportar livro caixa para Excel/CSV"
              >
                <Download size={14} />
                <span>Exportar CSV</span>
              </button>
            </div>
          </div>

          {/* Search & Level Filters Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative md:col-span-2">
              <input 
                type="text" 
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                placeholder="Pesquisar por doador, destinatário, chave PIX ou ID da doação..." 
                className="w-full bg-slate-950 border border-slate-800/80 focus:border-[#32BCAD] text-xs text-white pl-10 pr-4 py-2.5 rounded-xl outline-none transition-all placeholder:text-slate-600"
              />
              <Search className="absolute left-3.5 top-3 text-slate-600" size={14} />
            </div>

            <div className="relative">
              <select
                value={paymentLevelFilter}
                onChange={(e) => setPaymentLevelFilter(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 text-slate-300 text-xs py-2.5 px-3 rounded-lg appearance-none outline-none focus:border-[#32BCAD]"
              >
                <option value="all">Filtrar por Nível: Todos</option>
                <option value="1">Apenas Nível 1</option>
                <option value="2">Apenas Nível 2</option>
                <option value="3">Apenas Nível 3</option>
                <option value="4">Apenas Nível 4</option>
                <option value="5">Apenas Nível 5</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-3 text-slate-600 pointer-events-none" size={13} />
            </div>
          </div>

          {/* Grid list of receipts */}
          {filteredPayments.length === 0 ? (
            <div className="text-center py-16 bg-slate-950/20 rounded-xl border border-slate-850/50 flex flex-col items-center justify-center gap-2">
              <FileText size={28} className="text-slate-600" />
              <p className="text-slate-400 text-xs font-bold">Nenhum registro de pagamento encontrado</p>
              <p className="text-[10px] text-slate-500 font-semibold uppercase">Tente alterar o filtro selecionado.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPayments.map((p) => (
                <div 
                  key={p.id} 
                  className={`p-5 bg-slate-950/30 border rounded-2xl flex flex-col justify-between hover:border-slate-700 transition-all gap-5 relative overflow-hidden ${
                    p.status === 'pending_verification' ? 'border-amber-500/30 shadow-[0_4px_20px_rgba(245,158,11,0.03)]' : 'border-slate-800/80'
                  }`}
                >
                  {/* Verification Alert Glow for pending */}
                  {p.status === 'pending_verification' && (
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-500 to-amber-600"></div>
                  )}

                  {/* Payment Details */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <span className="text-[9px] uppercase font-black tracking-widest text-slate-500">Doador (Remetente)</span>
                        <h5 className="font-bold text-white text-sm tracking-wide mt-0.5">{p.senderName || 'Membro do Sistema'}</h5>
                        <p className="text-[10px] text-slate-500 font-mono select-all mt-0.5">{p.senderPixKey || 'Chave não identificada'}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black font-mono text-emerald-400">R$ 10,00</span>
                        <div className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider mt-1">{formatDate(p.createdAt)}</div>
                      </div>
                    </div>

                    <div className="border-t border-slate-850/60 pt-3 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[9px] uppercase font-bold tracking-widest text-slate-500">Destinatário (Recebedor)</span>
                        <p className="font-bold text-slate-300 text-xs tracking-wide mt-0.5">{p.receiverName || 'Administrador'}</p>
                        <p className="text-[10px] text-slate-500 font-mono select-all mt-0.5">{p.receiverPixKey || p.receiverId}</p>
                      </div>
                      <span className="text-[9px] bg-slate-900 border border-slate-800 text-slate-400 px-2 py-0.5 rounded font-mono uppercase tracking-wider">Level {p.level}</span>
                    </div>
                  </div>

                  {/* Actions & Status row */}
                  <div className="flex items-center justify-between border-t border-slate-850/60 pt-4 mt-1">
                    <div>
                      {p.status === 'verified' ? (
                        <span className="px-2.5 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold text-[9px] tracking-widest uppercase shadow-sm">
                          Confirmado
                        </span>
                      ) : p.status === 'pending_verification' ? (
                        <span className="px-2.5 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 font-bold text-[9px] tracking-widest uppercase animate-pulse">
                          Aguardando
                        </span>
                      ) : (
                        <span className="px-2.5 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 font-bold text-[9px] tracking-widest uppercase">
                          Pendente
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setSelectedPayment(p)}
                        className="p-2 bg-slate-800/80 hover:bg-[#32BCAD] text-slate-300 hover:text-slate-900 border border-slate-700/50 hover:border-transparent rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-bold px-3"
                      >
                        <Eye size={12} /> Recibo
                      </button>

                      {p.status === 'pending_verification' && (
                        <button
                          onClick={() => approvePayment(p)}
                          disabled={actionLoading === p.id}
                          className="p-2 bg-emerald-500 hover:bg-emerald-600 text-slate-950 rounded-lg transition-colors cursor-pointer flex items-center gap-1 text-[11px] font-black px-3.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]"
                        >
                          {actionLoading === p.id ? (
                            <Loader2 className="animate-spin" size={12} />
                          ) : (
                            <><Check size={12} className="stroke-[3]" /> Aprovar</>
                          )}
                        </button>
                      )}

                      <button
                        onClick={() => deletePaymentEntry(p.id)}
                        disabled={actionLoading === p.id}
                        className="p-2 text-slate-600 hover:text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                        title="Deletar Registro"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* DETAIL RECEIPT MODAL */}
      <AnimatePresence>
        {selectedPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => setSelectedPayment(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <FileText size={14} className="text-[#32BCAD]" /> Comprovante de Doação
              </h3>
              
              {/* Image Viewport */}
              <div className="bg-slate-950 rounded-2xl overflow-hidden border border-slate-800/80 flex items-center justify-center min-h-[300px] mb-5 p-1.5">
                {selectedPayment.receiptImage ? (
                  <img 
                    src={selectedPayment.receiptImage} 
                    alt="Comprovante PIX" 
                    className="w-full h-auto object-contain rounded-xl max-h-[460px] shadow-inner select-none" 
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="text-center p-6 space-y-3">
                    <AlertCircle className="text-slate-600 mx-auto animate-pulse" size={36} />
                    <p className="text-xs text-slate-400 font-medium">Comprovante de pagamento não anexado.</p>
                  </div>
                )}
              </div>

              {/* Approve actions in modal */}
              {selectedPayment.status === 'pending_verification' && (
                <div className="space-y-4 pt-4 border-t border-slate-850">
                  <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-2 text-[11px] leading-relaxed text-amber-300">
                    <Info size={14} className="shrink-0 mt-0.5" />
                    <span>A confirmação deste comprovante ativará automaticamente o remetente <strong>{selectedPayment.senderName}</strong> no sistema de doações.</span>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => approvePayment(selectedPayment)}
                      disabled={actionLoading === selectedPayment.id}
                      className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold uppercase tracking-widest text-xs py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                    >
                      {actionLoading === selectedPayment.id ? (
                        <Loader2 className="animate-spin" size={14} />
                      ) : (
                        <><Check size={14} className="stroke-[3]" /> Confirmar Pagamento</>
                      )}
                    </button>
                    
                    <button
                      onClick={() => deletePaymentEntry(selectedPayment.id)}
                      className="px-4 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-bold text-xs rounded-xl border border-red-500/20 hover:border-transparent transition-all cursor-pointer flex items-center justify-center"
                      title="Deletar"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}

              {selectedPayment.status === 'verified' && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/25 rounded-xl flex items-center justify-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest shadow-sm">
                  <UserCheck size={14} /> Transação Confirmada & Membro Ativado
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      
      {/* CREATE NEW USER / RECEIVER MODAL */}
      <AnimatePresence>
        {showCreateUserModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => {
                  setShowCreateUserModal(false);
                  setCreateUserError(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <UserPlus size={16} className="text-[#32BCAD]" /> Cadastrar Novo Recebedor
              </h3>

              <form onSubmit={handleCreateUserSubmit} className="space-y-4">
                {createUserError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{createUserError}</span>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Nome Completo</label>
                  <input 
                    type="text" 
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    placeholder="Ex: João da Silva" 
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Tipo de Chave PIX</label>
                    <select
                      value={newUserPixType}
                      onChange={(e) => setNewUserPixType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all cursor-pointer"
                    >
                      <option value="cpf">CPF</option>
                      <option value="email">E-mail</option>
                      <option value="telefone">Telefone</option>
                      <option value="aleatoria">Aleatória</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Chave PIX</label>
                    <input 
                      type="text" 
                      value={newUserPixKey}
                      onChange={(e) => setNewUserPixKey(e.target.value)}
                      placeholder="Chave para recebimentos" 
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Cód. Patrocinador (Indicação)</label>
                    <input 
                      type="text" 
                      value={newUserSponsorCode}
                      onChange={(e) => setNewSponsorCode(e.target.value)}
                      placeholder="Opcional (Ex: IND123)" 
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Cód. de Convite Próprio</label>
                    <input 
                      type="text" 
                      value={newUserInviteCode}
                      onChange={(e) => setNewUserInviteCode(e.target.value)}
                      placeholder="Em branco para gerar" 
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all uppercase"
                    />
                  </div>
                </div>

                {/* Account Status */}
                <div className="bg-slate-950/40 p-4 border border-slate-800/60 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-white block">Status de Ativação Inicial</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Se ativo, poderá receber doações na rede imediatamente</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={newUserIsActive} 
                      onChange={(e) => setNewUserIsActive(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#32BCAD] peer-checked:after:bg-slate-950"></div>
                  </label>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateUserModal(false);
                      setCreateUserError(null);
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={createUserLoading}
                    className="flex-1 bg-[#32BCAD] hover:bg-[#269689] text-slate-900 text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {createUserLoading ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        <Check size={14} className="stroke-[3]" />
                        Salvar Usuário
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* EDIT USER / RECEIVER PROFILE MODAL */}
      <AnimatePresence>
        {editingUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-md shadow-2xl relative max-h-[92vh] overflow-y-auto custom-scrollbar"
            >
              <button 
                onClick={() => {
                  setEditingUser(null);
                  setEditUserError(null);
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white p-2 rounded-full hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
              
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-1.5">
                <Pencil size={16} className="text-[#32BCAD]" /> Editar Perfil do Usuário
              </h3>

              <form onSubmit={handleEditUserSubmit} className="space-y-4">
                {editUserError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex gap-2">
                    <AlertCircle size={14} className="shrink-0 mt-0.5" />
                    <span>{editUserError}</span>
                  </div>
                )}

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">ID do Usuário (UID)</label>
                  <input 
                    type="text" 
                    value={editingUser.id}
                    disabled
                    className="w-full bg-slate-950 border border-slate-800 text-xs text-slate-500 p-3 rounded-xl outline-none cursor-not-allowed select-all font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Nome Completo</label>
                  <input 
                    type="text" 
                    value={editUserName}
                    onChange={(e) => setEditUserName(e.target.value)}
                    placeholder="Ex: João da Silva" 
                    className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Tipo de Chave PIX</label>
                    <select
                      value={editUserPixType}
                      onChange={(e) => setEditUserPixType(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all cursor-pointer"
                    >
                      <option value="cpf">CPF</option>
                      <option value="email">E-mail</option>
                      <option value="telefone">Telefone</option>
                      <option value="aleatoria">Aleatória</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Chave PIX</label>
                    <input 
                      type="text" 
                      value={editUserPixKey}
                      onChange={(e) => setEditUserPixKey(e.target.value)}
                      placeholder="Chave para recebimentos" 
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Cód. Patrocinador (Indicação)</label>
                    <input 
                      type="text" 
                      value={editUserSponsorCode}
                      onChange={(e) => setEditUserSponsorCode(e.target.value)}
                      placeholder="Sem patrocinador" 
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all uppercase"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">Cód. de Convite Próprio</label>
                    <input 
                      type="text" 
                      value={editUserInviteCode}
                      onChange={(e) => setEditUserInviteCode(e.target.value)}
                      placeholder="Nenhum código" 
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all uppercase"
                    />
                  </div>
                </div>

                {/* WhatsApp Fields */}
                <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-800/40">
                  <div>
                    <label className="text-[10px] text-slate-500 uppercase tracking-widest font-bold block mb-1.5">WhatsApp (com DDD)</label>
                    <input 
                      type="text" 
                      value={editUserWhatsapp}
                      onChange={(e) => setEditUserWhatsapp(e.target.value)}
                      placeholder="Ex: 5511999999999" 
                      className="w-full bg-slate-950 border border-slate-800 focus:border-[#32BCAD] text-xs text-white p-3 rounded-xl outline-none transition-all"
                    />
                  </div>

                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer group">
                      <input 
                        type="checkbox"
                        checked={editUserAllowWhatsappContact}
                        onChange={(e) => setEditUserAllowWhatsappContact(e.target.checked)}
                        className="rounded bg-slate-950 border-slate-800 text-[#32BCAD] focus:ring-0 cursor-pointer w-4 h-4"
                      />
                      <span className="text-[11px] font-bold text-slate-300 group-hover:text-white transition-colors">Permitir Contato WhatsApp</span>
                    </label>
                  </div>
                </div>

                {/* Account Status */}
                <div className="bg-slate-950/40 p-4 border border-slate-800/60 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-white block">Status da Conta</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Se ativo, pode receber doações P2P de R$ 10</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editUserIsActive} 
                      onChange={(e) => setEditUserIsActive(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#32BCAD] peer-checked:after:bg-slate-950"></div>
                  </label>
                </div>

                {/* Admin Privileges Status */}
                <div className="bg-slate-950/40 p-4 border border-slate-800/60 rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[11px] font-bold text-white block">Permissões de Administrador</span>
                    <span className="text-[9px] text-slate-500 block mt-0.5">Permite acessar este console de gerenciamento</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editUserIsAdmin} 
                      onChange={(e) => setEditUserIsAdmin(e.target.checked)}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-slate-300 after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#32BCAD] peer-checked:after:bg-slate-950"></div>
                  </label>
                </div>

                {/* Danger Zone: Delete User */}
                <div className="pt-4 border-t border-slate-800/60">
                  <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-bold text-red-400 block">Zona de Perigo</span>
                      <span className="text-[9px] text-slate-500 block">Excluir permanentemente este usuário e dados do sistema</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => deleteUserAccount(editingUser.id, editingUser.name)}
                      disabled={editUserLoading || actionLoading === editingUser.id}
                      className="w-full sm:w-auto px-4 py-2.5 bg-red-500/10 hover:bg-red-500 hover:text-white text-red-400 text-xs font-bold rounded-xl border border-red-500/20 hover:border-transparent transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(239,68,68,0.15)]"
                    >
                      <Trash2 size={13} />
                      Excluir Usuário
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingUser(null);
                      setEditUserError(null);
                    }}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={editUserLoading}
                    className="flex-1 bg-[#32BCAD] hover:bg-[#269689] text-slate-900 text-xs font-bold py-3.5 rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    {editUserLoading ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : (
                      <>
                        <Check size={14} className="stroke-[3]" />
                        Salvar Alterações
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
