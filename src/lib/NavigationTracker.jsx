import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { base44 } from '@/api/base44Client';
import { pagesConfig } from '@/pages.config';

export default function NavigationTracker() {
    const location = useLocation();
    const { user, isAuthenticated } = useAuth();
    const { Pages, mainPage } = pagesConfig;
    const mainPageKey = mainPage ?? Object.keys(Pages)[0];
    const cachedUserRef = useRef(null);

    // Limpar cache quando usuário desloga
    useEffect(() => {
        if (isAuthenticated === false) {
            cachedUserRef.current = null;
        }
    }, [isAuthenticated]);

    // Log user activity when navigating to a page
    useEffect(() => {
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );
            pageName = matchedKey || pathSegment;
        }

        const trackNavigation = async () => {
            if (!pageName) return;

            let currentUser = user;

            // Fallback: se useAuth() ainda não populou o user, tentar base44.auth.me()
            if (!currentUser) {
                if (cachedUserRef.current) {
                    currentUser = cachedUserRef.current;
                } else {
                    try {
                        currentUser = await base44.auth.me();
                        if (currentUser) cachedUserRef.current = currentUser;
                    } catch (e) {
                        return;
                    }
                }
            }

            if (!currentUser) return;

            base44.appLogs.logUserInApp(pageName).catch(() => {});

            // Tentar criação direta primeiro (rápido)
            try {
                await base44.entities.NavegacaoUsuario.create({
                    user_id: currentUser.id,
                    user_email: currentUser.email,
                    user_name: currentUser.full_name || currentUser.nome_tratamento || '',
                    pagina: pageName,
                    acessado_em: new Date().toISOString(),
                });
            } catch (e) {
                // Fallback: função backend com service role (contorna permissões)
                try {
                    await base44.functions.invoke('registrarAtividadeUsuario', { pagina: pageName });
                } catch (e2) {
                    console.error('[NavigationTracker] Falha ao registrar navegação:', e?.message || e);
                }
            }
        };

        trackNavigation();
    }, [location, isAuthenticated, user, Pages, mainPageKey]);

    return null;
}