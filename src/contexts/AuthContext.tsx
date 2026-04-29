import { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import { supabase, isDemoMode } from '@/db/supabase';
import type { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { toast } from 'sonner';
import i18n from '@/i18n';

export async function getProfile(userId: string): Promise<Profile | null> {
  // 缺少环境变量时返回 null
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error) {
    console.error('获取用户信息失败:', error);
    return null;
  }
  return data;
}

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signUpWithUsername: (username: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  signInAsDemo: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshProfile = async () => {
    if (!user) {
      setProfile(null);
      return;
    }

    // 缺少环境变量时跳过 profile 刷新
    if (!supabase) {
      return;
    }

    try {
      let profileData = await getProfile(user.id);
      
      // 如果profile不存在，自动创建
      if (!profileData) {
        
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            username: user.email?.split('@')[0] || `user_${Date.now()}`,
            full_name: user.email?.split('@')[0] || 'User',
            email: user.email,
            role: 'user',
            tenant_id: 'JP',
            language_preference: 'zh-CN',
            status: 'active',
          })
          .select()
          .maybeSingle();

        if (createError) {
          console.error('创建profile失败:', createError);
          toast.error('用户信息初始化失败');
          return;
        }

        if (!newProfile) {
          console.error('创建profile失败：未返回数据');
          toast.error('用户信息初始化失败');
          return;
        }

        profileData = newProfile;
        toast.success('用户信息已初始化');
      }
      
      setProfile(profileData);
      
      // 根据用户语言偏好设置界面语言
      if (profileData?.language_preference) {
        i18n.changeLanguage(profileData.language_preference);
      }
    } catch (error) {
      console.error('刷新profile失败:', error);
    }
  };

  useEffect(() => {
    // 缺少环境变量时跳过 Supabase 认证
    if (!supabase) {
      setUser(null);
      setProfile(null);
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data: { session } }: { data: { session: Session | null } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session: Session | null) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      refreshProfile();
    } else {
      setProfile(null);
    }
  }, [user]);

  const signInWithUsername = async (username: string, password: string) => {
    // 缺少环境变量时不支持登录
    if (!supabase) {
      return { error: new Error('缺少 Supabase 环境变量，无法登录') };
    }

    try {
      const email = `${username}@miaoda.com`;
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // 更新最后登录时间
      if (user) {
        await supabase
          .from('profiles')
          .update({ last_login_at: new Date().toISOString() })
          .eq('id', user.id);
      }

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signUpWithUsername = async (username: string, password: string) => {
    // 缺少环境变量时不支持注册
    if (!supabase) {
      return { error: new Error('缺少 Supabase 环境变量，无法注册') };
    }

    try {
      const email = `${username}@miaoda.com`;
      const { error } = await supabase.auth.signUp({
        email,
        password,
      });

      if (error) throw error;

      return { error: null };
    } catch (error) {
      return { error: error as Error };
    }
  };

  const signOut = async () => {
    // 缺少环境变量时跳过 Supabase 登出
    if (!supabase) {
      setUser(null);
      setProfile(null);
      toast.success('已退出登录');
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setProfile(null);
    toast.success('已退出登录');
  };

  /** Demo 模式一键进入：不依赖 Supabase，直接注入演示用户 */
  const signInAsDemo = useCallback(() => {
    if (!isDemoMode) return;
    const demoUser = {
      id: 'demo-user-id',
      email: 'demo@cobotworks.jp',
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
    } as User;
    const demoProfile: Profile = {
      id: 'demo-user-id',
      username: 'demo_admin',
      full_name: '演示管理员',
      email: 'demo@cobotworks.jp',
      phone: null,
      language_preference: 'zh-CN',
      organization_id: null,
      tenant_id: 'JP',
      role: 'admin',
      status: 'active',
      last_login_at: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setUser(demoUser);
    setProfile(demoProfile);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithUsername,
        signUpWithUsername,
        signOut,
        refreshProfile,
        signInAsDemo,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
