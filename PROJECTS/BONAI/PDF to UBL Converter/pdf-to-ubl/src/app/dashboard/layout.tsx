'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';
import { LayoutDashboard, FileText, Key, BookOpen, Settings, ShieldCheck, Users, Cpu, CreditCard, LogOut } from 'lucide-react';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
    const pathname = usePathname();
    const { data: session } = useSession();
    const isAdmin = (session?.user as any)?.role === 'ADMIN';

    const links = [
        { href: '/dashboard', label: 'Overzicht', icon: LayoutDashboard },
        { href: '/dashboard/convert', label: 'Conversie', icon: FileText },
        { href: '/dashboard/api-keys', label: 'API Keys', icon: Key },
        { href: '/dashboard/api-docs', label: 'API Documentatie', icon: BookOpen },
        { href: '/dashboard/settings', label: 'Instellingen', icon: Settings },
    ];

    const adminLinks = [
        { href: '/admin', label: 'Admin Dashboard', icon: ShieldCheck },
        { href: '/admin/users', label: 'Gebruikers', icon: Users },
        { href: '/admin/ai-config', label: 'AI Configuratie', icon: Cpu },
        { href: '/admin/credits', label: 'Credits', icon: CreditCard },
    ];

    return (
        <div style={{ display: 'flex', minHeight: '100vh' }}>
            <aside className="sidebar">
                <div style={{ padding: '0 24px', marginBottom: '28px' }}>
                    <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: '8px', textDecoration: 'none' }}>
                        <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--foreground)' }}>Bonai</span>
                        <span style={{ fontSize: '11px', color: 'var(--muted)' }}>UBL Converter</span>
                    </Link>
                </div>

                <nav style={{ flex: 1 }}>
                    <div style={{ padding: '0 16px', marginBottom: '6px' }}>
                        <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '8px' }}>
                            Dashboard
                        </span>
                    </div>
                    {links.map(link => (
                        <Link key={link.href} href={link.href}
                            className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}>
                            <link.icon size={16} />
                            <span>{link.label}</span>
                        </Link>
                    ))}

                    {isAdmin && (
                        <>
                            <div style={{ padding: '16px 16px 6px', marginTop: '8px' }}>
                                <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.5px', paddingLeft: '8px' }}>
                                    Admin
                                </span>
                            </div>
                            {adminLinks.map(link => (
                                <Link key={link.href} href={link.href}
                                    className={`sidebar-link ${pathname === link.href ? 'active' : ''}`}>
                                    <link.icon size={16} />
                                    <span>{link.label}</span>
                                </Link>
                            ))}
                        </>
                    )}
                </nav>

                <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '13px', fontWeight: 500, marginBottom: '4px', color: 'var(--foreground)' }}>
                        {session?.user?.name || session?.user?.email || 'Gebruiker'}
                    </div>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '12px' }}>
                        {(session?.user as any)?.organizationName || ''}
                    </div>
                    <button onClick={() => signOut({ callbackUrl: '/' })} className="btn-secondary"
                        style={{ width: '100%', padding: '8px', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
                        <LogOut size={14} />
                        Uitloggen
                    </button>
                </div>
            </aside>

            <main className="main-content">
                {children}
            </main>
        </div>
    );
}
