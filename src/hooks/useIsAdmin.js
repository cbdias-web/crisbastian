import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';

export default function useIsAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  useEffect(() => {
    base44.auth.me().then(u => {
      setIsAdmin(u?.role === 'admin' || u?.permissao_admin === true);
    }).catch(() => {});
  }, []);
  return isAdmin;
}