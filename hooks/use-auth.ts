"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<string>("driver"); 
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    
    const getUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
        
        // TODO: In a real app, you would fetch the user profile from the database 
        // to get the authoritative role.
        // For now, we'll try to get it from metadata or default to driver
        if (session?.user) {
            const metadata = session.user.user_metadata;
            if (metadata?.role) {
                setRole(metadata.role);
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
    });

    return () => subscription.unsubscribe();
  }, []);

  return { 
    user, 
    role, 
    effectiveRole: role, // detailed role logic (impersonation) preserved in name
    isLoading 
  };
}
