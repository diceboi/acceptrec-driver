"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [actualRole, setActualRole] = useState<string>("driver");
  const [viewAsRole, setViewAsRole] = useState<string | null>(null);
  const [viewAsClientId, setViewAsClientId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        if (session?.user) {
          const metadata = session.user.user_metadata;
          if (metadata?.role) {
            setActualRole(metadata.role);
          }
          
          // Load impersonation state from localStorage
          const storedViewAsRole = localStorage.getItem('viewAsRole');
          const storedViewAsClientId = localStorage.getItem('viewAsClientId');
          
          if (storedViewAsRole) {
            setViewAsRole(storedViewAsRole);
          }
          if (storedViewAsClientId) {
            setViewAsClientId(storedViewAsClientId);
          }
        }
      } catch (e) {
        console.error("Error getting session", e);
      } finally {
        setIsLoading(false);
      }
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      
      // Clear impersonation on logout
      if (!session) {
        setViewAsRole(null);
        setViewAsClientId(null);
        localStorage.removeItem('viewAsRole');
        localStorage.removeItem('viewAsClientId');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const effectiveRole = viewAsRole || actualRole;
  const isImpersonating = viewAsRole !== null;

  const impersonate = (role: 'admin' | 'driver' | 'client') => {
    setViewAsRole(role);
    localStorage.setItem('viewAsRole', role);
    if (role !== 'client') {
      localStorage.removeItem('viewAsClientId');
      setViewAsClientId(null);
    }
  };

  const impersonateClient = (clientId: string) => {
    setViewAsRole('client');
    setViewAsClientId(clientId);
    localStorage.setItem('viewAsRole', 'client');
    localStorage.setItem('viewAsClientId', clientId);
  };

  const stopImpersonating = () => {
    setViewAsRole(null);
    setViewAsClientId(null);
    localStorage.removeItem('viewAsRole');
    localStorage.removeItem('viewAsClientId');
  };

  return { 
    user,
    role: actualRole,
    actualRole,
    effectiveRole,
    viewAsClientId,
    isImpersonating,
    impersonate,
    impersonateClient,
    stopImpersonating,
    isLoading 
  };
}
