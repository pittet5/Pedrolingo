import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Moon, Sun, Monitor, Trash2, Bell, Sparkles, GraduationCap, Users } from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { UserProfile } from './LoginScreen';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentProfileId: string;
  onProfileDeleted: (deletedId: string) => void;
}

export default function SettingsModal({ isOpen, onClose, currentProfileId, onProfileDeleted }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [dbProfile, setDbProfile] = useState<any | null>(null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && currentProfileId) {
      const fetchProfile = async () => {
        setLoading(true);
        setError(null);
        try {
          const res = await fetch(`/api/auth/profile/${currentProfileId}`);
          const data = await res.json();
          if (data.success && data.profile) {
            setDbProfile(data.profile);
            setNotificationsEnabled(data.profile.notifications_enabled);
            setAnimationsEnabled(data.profile.animations_enabled);
          } else {
            setError(data.error || 'Erro ao carregar perfil.');
          }
        } catch (err: any) {
          console.error(err);
          setError('Erro de rede ao carregar perfil.');
        } finally {
          setLoading(false);
        }
      };
      fetchProfile();
    }
  }, [isOpen, currentProfileId]);

  const handleToggleNotifications = async () => {
    const nextVal = !notificationsEnabled;
    setNotificationsEnabled(nextVal);
    try {
      await fetch(`/api/auth/profile/${currentProfileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notifications_enabled: nextVal })
      });
    } catch (err) {
      console.error('Failed to update notifications preference:', err);
    }
  };

  const handleToggleAnimations = async () => {
    const nextVal = !animationsEnabled;
    setAnimationsEnabled(nextVal);
    try {
      await fetch(`/api/auth/profile/${currentProfileId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ animations_enabled: nextVal })
      });
    } catch (err) {
      console.error('Failed to update animations preference:', err);
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Tem certeza que deseja excluir esta conta? Esta ação é irreversível e apagará todos os seus dados.")) {
      try {
        const res = await fetch(`/api/auth/profile/${currentProfileId}`, {
          method: 'DELETE'
        });
        const data = await res.json();
        if (data.success) {
          onProfileDeleted(currentProfileId);
          onClose();
        } else {
          alert(data.error || 'Erro ao excluir conta.');
        }
      } catch (err) {
        console.error(err);
        alert('Erro de rede ao excluir conta.');
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm dark:bg-black/80"
      />

      {/* Modal */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="relative w-full max-w-2xl bg-white dark:bg-[#0A1929] rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="flex items-center justify-between p-6 border-b border-slate-100 dark:border-white/10">
          <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configurações</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 dark:text-slate-400 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex flex-col gap-8">
          
          {/* Theme Settings */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Aparência</h3>
            <div className="grid grid-cols-3 gap-3">
              <button 
                onClick={() => setTheme('light')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition ${
                  theme === 'light' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Sun className="w-6 h-6" />
                <span className="font-semibold text-sm">Claro</span>
              </button>
              
              <button 
                onClick={() => setTheme('dark')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition ${
                  theme === 'dark' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Moon className="w-6 h-6" />
                <span className="font-semibold text-sm">Escuro</span>
              </button>
              
              <button 
                onClick={() => setTheme('system')}
                className={`flex flex-col items-center gap-3 p-4 rounded-2xl border-2 transition ${
                  theme === 'system' ? 'border-blue-500 bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400' : 'border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5'
                }`}
              >
                <Monitor className="w-6 h-6" />
                <span className="font-semibold text-sm">Sistema</span>
              </button>
            </div>
          </section>

          {/* Preferences */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Preferências</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl">
                    <Bell className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Notificações Push</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Receba alertas sobre tarefas e aulas</p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleNotifications}
                  className={`w-12 h-6 rounded-full transition-colors relative ${notificationsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${notificationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-100 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 rounded-xl">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white">Animações de Interface</h4>
                    <p className="text-sm text-slate-500 dark:text-slate-400">Ative ou desative efeitos visuais</p>
                  </div>
                </div>
                <button 
                  onClick={handleToggleAnimations}
                  className={`w-12 h-6 rounded-full transition-colors relative ${animationsEnabled ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                  <div className={`absolute top-1 left-1 w-4 h-4 rounded-full bg-white transition-transform ${animationsEnabled ? 'translate-x-6' : 'translate-x-0'}`} />
                </button>
              </div>
            </div>
          </section>

          {/* Manage Account */}
          <section>
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4">Conta do Usuário</h3>
            {loading ? (
              <div className="text-center py-4 text-slate-500 dark:text-slate-400">Carregando dados...</div>
            ) : error ? (
              <div className="text-center py-4 text-red-500 font-semibold">{error}</div>
            ) : dbProfile ? (
              <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-white dark:bg-white/5">
                <div className="flex items-center gap-4">
                  <img src={dbProfile.avatar} alt={dbProfile.name} className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 border-2 border-white dark:border-slate-700" />
                  <div>
                    <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                      {dbProfile.name}
                      <span className="text-[10px] font-bold bg-blue-100 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400 px-2 py-0.5 rounded-full">
                        {dbProfile.role === 'teacher' ? 'Professor' : 'Aluno'}
                      </span>
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {dbProfile.email}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={handleDeleteAccount}
                  className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition flex items-center gap-1.5 text-xs font-bold"
                  title="Excluir Perfil"
                >
                  <Trash2 className="w-4.5 h-4.5" />
                  <span>Excluir Conta</span>
                </button>
              </div>
            ) : (
              <p className="text-center text-slate-500 dark:text-slate-400 py-4">Nenhum perfil encontrado.</p>
            )}
          </section>
          
        </div>
      </motion.div>
    </div>
  );
}
