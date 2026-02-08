'use client';

import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Eye, EyeOff } from 'lucide-react';

export default function ImpersonationBanner() {
  const { isImpersonating, effectiveRole, actualRole, stopImpersonating } = useAuth();
  
  if (!isImpersonating || actualRole !== 'super_admin') return null;
  
  const roleLabel = effectiveRole === 'driver' ? 'Driver' : effectiveRole === 'client' ? 'Client' : 'Admin';
  
  return (
    <div className="bg-amber-500 text-amber-950 px-4 py-2 flex items-center justify-center gap-4" data-testid="banner-impersonation">
      <div className="flex items-center gap-2">
        <Eye className="w-4 h-4" />
        <span className="font-medium">
          Viewing as {roleLabel} - The UI is showing what a {effectiveRole} would see
        </span>
      </div>
      <Button 
        size="sm" 
        variant="outline" 
        className="h-7 bg-amber-100 border-amber-700 text-amber-900 hover:bg-amber-200"
        onClick={() => stopImpersonating()}
        data-testid="button-exit-impersonation"
      >
        <EyeOff className="w-3 h-3 mr-1" />
        Exit View
      </Button>
    </div>
  );
}
