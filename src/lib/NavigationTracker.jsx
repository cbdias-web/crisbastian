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

    // Log user activity when navigating to a page
    useEffect(() => {
        // Extract page name from pathname
        const pathname = location.pathname;
        let pageName;

        if (pathname === '/' || pathname === '') {
            pageName = mainPageKey;
        } else {
            // Remove leading slash and get the first segment
            const pathSegment = pathname.replace(/^\//, '').split('/')[0];

            // Try case-insensitive lookup in Pages config
            const pageKeys = Object.keys(Pages);
            const matchedKey = pageKeys.find(
                key => key.toLowerCase() === pathSegment.toLowerCase()
            );

            pageName = matchedKey || pathSegment;
        }

        const trackNavigation = async () => {
            if (!pageName) return;

            let currentUser = user;

            // Fallback: if useAuth() hasn't populated the user yet, try base44.auth.me() directly
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

            // Registrar navegação real na entidade NavegacaoUsuario
            base44.entities.NavegacaoUsuario.create({
                user_id: currentUser.id,
                user_email: currentUser.email,
                user_name: currentUser.full_name || currentUser.nome_tratamento || '',
                pagina: pageName,
                acessado_em: new Date().toISOString(),
            }).catch((e) => {
                console.error('[NavigationTracker] Falha ao registrar navegação:', e?.message || e);
            });
        };

        trackNavigation();
    }, [location, isAuthenticated, user, Pages, mainPageKey]);

    return null;
}