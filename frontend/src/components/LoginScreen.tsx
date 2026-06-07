import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GraduationCap, Users, ArrowRight, Sparkles, Plus, ChevronLeft, UserCircle } from 'lucide-react';

export interface UserProfile {
  id: string;
  name: string;
  role: 'teacher' | 'student';
  avatar: string;
}

interface LoginScreenProps {
  onLogin: (profile: UserProfile) => void;
}

const AVATARS = [
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix&backgroundColor=b6e3f4',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Alex&backgroundColor=ffdfbf',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Maria&backgroundColor=d1d4f9',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Leo&backgroundColor=c0aede',
  'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah&backgroundColor=b6e3f4',
];

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [mode, setMode] = useState<'selecting' | 'creating'>('selecting');
  
  // Create Profile State
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<'teacher' | 'student' | null>(null);
  const [newAvatar, setNewAvatar] = useState(AVATARS[0]);

  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null);

  useEffect(() => {
    const savedProfiles = localStorage.getItem('pedrolingo_profiles');
    if (savedProfiles) {
      try {
        setProfiles(JSON.parse(savedProfiles));
      } catch (e) {
        console.error('Error parsing profiles', e);
      }
    }
  }, []);

  const saveProfile = (newProfiles: UserProfile[]) => {
    setProfiles(newProfiles);
    localStorage.setItem('pedrolingo_profiles', JSON.stringify(newProfiles));
  };

  const handleCreateProfile = () => {
    if (!newName.trim() || !newRole) return;
    
    const newProfile: UserProfile = {
      id: Math.random().toString(36).substring(2, 9),
      name: newName.trim(),
      role: newRole,
      avatar: newAvatar
    };

    saveProfile([...profiles, newProfile]);
    setMode('selecting');
    setNewName('');
    setNewRole(null);
    setNewAvatar(AVATARS[0]);
  };

  const handleSelectProfile = (profile: UserProfile) => {
    setSelectedProfileId(profile.id);
    setIsLoggingIn(true);
    setTimeout(() => {
      onLogin(profile);
    }, 800);
  };

  return (
    <div className="min-h-screen bg-[#0A1929] flex flex-col items-center justify-center p-6 relative overflow-hidden font-sans">
      {/* Background dynamic elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-[40%] left-[50%] translate-x-[-50%] translate-y-[-50%] w-[60%] h-[60%] bg-emerald-500/10 rounded-full blur-[150px] pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-24 h-24 rounded-3xl overflow-hidden shadow-2xl shadow-blue-900/30 mb-8 border border-white/10 z-10 bg-white flex shrink-0"
      >
        <img src="/logo.png" alt="Pedrolingo Logo" className="w-full h-full object-contain" />
      </motion.div>

      <div className="w-full max-w-4xl relative z-10">
        <AnimatePresence mode="wait">
          {mode === 'selecting' ? (
            <motion.div
              key="selecting"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col items-center"
            >
              <h1 className="text-4xl md:text-5xl font-extrabold text-white tracking-tight mb-4 text-center">
                Quem está acessando?
              </h1>
              <p className="text-slate-400 text-lg max-w-xl mx-auto text-center mb-12">
                Selecione seu perfil para continuar ou crie um novo.
              </p>

              <div className="flex flex-wrap justify-center gap-8">
                {profiles.map((profile) => (
                  <motion.button
                    key={profile.id}
                    whileHover={{ scale: 1.05, translateY: -5 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleSelectProfile(profile)}
                    className="flex flex-col items-center gap-4 group"
                  >
                    <div className={`relative w-32 h-32 rounded-3xl overflow-hidden border-4 transition-all duration-300 ${
                      selectedProfileId === profile.id ? 'border-emerald-500 shadow-xl shadow-emerald-500/30' : 'border-white/10 group-hover:border-white/50 group-hover:shadow-xl group-hover:shadow-white/10'
                    }`}>
                      <img src={profile.avatar} alt={profile.name} className="w-full h-full object-cover bg-white" />
                      
                      {isLoggingIn && selectedProfileId === profile.id && (
                        <div className="absolute inset-0 bg-emerald-500/80 flex items-center justify-center backdrop-blur-sm">
                          <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                            <Sparkles className="w-8 h-8 text-white" />
                          </motion.div>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-center">
                      <h3 className="text-xl font-bold text-white mb-1 group-hover:text-emerald-400 transition-colors">
                        {profile.name}
                      </h3>
                      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center justify-center gap-1">
                        {profile.role === 'teacher' ? <GraduationCap className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                        {profile.role === 'teacher' ? 'Professor' : 'Aluno'}
                      </span>
                    </div>
                  </motion.button>
                ))}

                {/* Add Profile Button */}
                <motion.button
                  whileHover={{ scale: 1.05, translateY: -5 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setMode('creating')}
                  className="flex flex-col items-center gap-4 group"
                >
                  <div className="w-32 h-32 rounded-3xl border-4 border-dashed border-white/20 bg-white/5 flex items-center justify-center group-hover:border-white/50 group-hover:bg-white/10 transition-all duration-300">
                    <Plus className="w-10 h-10 text-white/50 group-hover:text-white transition-colors" />
                  </div>
                  <div className="text-center">
                    <h3 className="text-xl font-bold text-white/50 group-hover:text-white transition-colors">
                      Novo Perfil
                    </h3>
                  </div>
                </motion.button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="creating"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-2xl mx-auto bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-8 shadow-2xl"
            >
              <button 
                onClick={() => setMode('selecting')}
                className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-8 font-semibold"
              >
                <ChevronLeft className="w-5 h-5" />
                Voltar
              </button>

              <h2 className="text-3xl font-bold text-white mb-8">Criar Novo Perfil</h2>

              <div className="space-y-8">
                {/* Avatar Selection */}
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Escolha um Avatar
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {AVATARS.map((avatarUrl) => (
                      <button
                        key={avatarUrl}
                        onClick={() => setNewAvatar(avatarUrl)}
                        className={`w-16 h-16 rounded-2xl overflow-hidden border-2 transition-all ${
                          newAvatar === avatarUrl ? 'border-blue-500 scale-110 shadow-lg shadow-blue-500/30' : 'border-transparent opacity-60 hover:opacity-100 hover:scale-105'
                        }`}
                      >
                        <img src={avatarUrl} alt="Avatar option" className="w-full h-full object-cover bg-white" />
                      </button>
                    ))}
                  </div>
                </div>

                {/* Name Input */}
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-2">
                    Nome de Exibição
                  </label>
                  <div className="relative">
                    <UserCircle className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400" />
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Ex: Pedro Silva"
                      className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-14 pr-4 text-white text-lg placeholder:text-white/20 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all"
                    />
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">
                    Tipo de Perfil
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={() => setNewRole('student')}
                      className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                        newRole === 'student' ? 'bg-blue-500/20 border-blue-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <Users className={`w-8 h-8 ${newRole === 'student' ? 'text-blue-400' : ''}`} />
                      <span className="font-bold">Aluno</span>
                    </button>
                    
                    <button
                      onClick={() => setNewRole('teacher')}
                      className={`p-6 rounded-2xl border-2 flex flex-col items-center gap-3 transition-all ${
                        newRole === 'teacher' ? 'bg-emerald-500/20 border-emerald-500 text-white' : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                      }`}
                    >
                      <GraduationCap className={`w-8 h-8 ${newRole === 'teacher' ? 'text-emerald-400' : ''}`} />
                      <span className="font-bold">Professor</span>
                    </button>
                  </div>
                </div>

                <motion.button
                  disabled={!newName.trim() || !newRole}
                  whileHover={(newName.trim() && newRole) ? { scale: 1.02 } : {}}
                  whileTap={(newName.trim() && newRole) ? { scale: 0.98 } : {}}
                  onClick={handleCreateProfile}
                  className={`w-full py-5 rounded-2xl font-bold text-lg flex items-center justify-center gap-2 transition-all ${
                    newName.trim() && newRole
                      ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-600/30'
                      : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/10'
                  }`}
                >
                  Criar Perfil e Continuar
                  <ArrowRight className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
