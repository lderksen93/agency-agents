'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.role === 'ADMIN';

    const links = [
        { href: '/dashboard', label: 'Overzicht', icon: '📊' },
        { href: '/dashboard/convert', label: 'Conversie', icon: '📄' },
        { href: '/dashboard/api-keys', label: 'API Keys', icon: '🔑' },
        { href: '/dashboard/api-docs', label: 'API Documentatie', icon: '📡' },
        { href: '/dashboard/settings', label: 'Instellingen', icon: '⚙️' },
    ];

    const adminLinks = [
        { href: '/admin', label: 'Admin Dashboard', icon: '🛡️' },
        { href: '/admin/users', label: 'Gebruikers', icon: '👥' },
        { href: '/admin/ai-config', label: 'AI Configuratie', icon: '🤖' },
        { href: '/admin/credits', label: 'Credits', icon: '💳' },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside className="sidebar">
                <div style={{ padding: '0 24px', marginBottom: '32px' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
                        <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 800, fontSize: '14px', color: 'white',
                        }}>P</div>
                        <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--foreground)' }}>Procai</span>
                    </Link>
                </div>

                {/* Zero data retention banner */}
                <div style={{ padding: '0 16px', marginBottom: '24px' }}>
                    <div className="zero-data-banner" style={{ fontSize: '11px' }}>
                        🔒 Zero Data Retention
                    </div>
                </div>

                {/* Main nav */}
                <nav style={{ flex: 1 }}>
                    <div style={{ padding: '0 16px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '8px' }}>
                            Dashboard
                        </span>
                    </div>
                    {links.map(link => (
                        <Link key={link.href} href={link.href}
                            className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}>
                            <span>{link.icon}</span>
                            <span>{link.label}</span>
                        </Link>
                    ))}

                    {isAdmin && (
                        <>
                            <div style={{ padding: '16px 16px 6px', marginTop: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', paddingLeft: '8px' }}>
                                    Admin
                                </span>
                            </div>
                            {adminLinks.map(link => (
                                <Link key={link.href} href={link.href}
                                    className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}>
                                    <span>{link.icon}</span>
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </>
                    )}
                </nav>

                {/* User section */}
                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px' }}>
                        {session?.user?.name || session?.user?.email || 'Gebruiker'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>
                        {(session?.user as any)?.organizationName || ''}
                    </div>
                    <button onClick={() => signOut({ callbackUrl: '/' })} className="btn-secondary"
                        style={{ width: '100%', padding: '8px', fontSize: '12px' }}>
                        Uitloggen
                    </button>
                </div>
            </aside>

            {/* Main content */}
            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
