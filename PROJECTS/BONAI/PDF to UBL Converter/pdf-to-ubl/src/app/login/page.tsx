'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const result = await signIn('credentials', {
            email,
            password,
            redirect: false,
        });

        if (result?.error) {
            setError('Ongeldige inloggegevens');
            setLoading(false);
        } else {
            router.push('/dashboard');
        }
    };

    return (
        <div style={{
            minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
            position: 'relative', overflow: 'hidden',
        }}>
            {/* Background */}
            <div style={{
                position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                width: '600px', height: '600px', borderRadius: '50%',
                background: 'radial-gradient(circle, rgba(99, 102, 241, 0.1) 0%, transparent 70%)',
                pointerEvents: 'none',
            }} />

            <div className="card" style={{ width: '100%', maxWidth: '420px', position: 'relative' }}>
                {/* Logo */}
                <div style={{ textAlign: 'center', marginBottom: '32px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '14px',
                        background: 'linear-gradient(135deg, var(--primary), #8b5cf6)',
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        fontWeight: 800, fontSize: '20px', color: 'white', marginBottom: '16px',
                    }}>P</div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700 }}>Inloggen bij Procai</h1>
                    <p style={{ color: 'var(--muted)', fontSize: '14px', marginTop: '8px' }}>
                        PDF naar UBL Converter
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: '10px', padding: '12px', marginBottom: '20px',
                        color: 'var(--danger)', fontSize: '13px', textAlign: 'center',
                    }}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label className="label">E-mailadres</label>
                        <input
                            type="email"
                            className="input"
                            placeholder="uw@email.nl"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required
                        />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                        <label className="label">Wachtwoord</label>
                        <input
                            type="password"
                            className="input"
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                        />
                    </div>

                    <button type="submit" className="btn-primary" disabled={loading}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {loading && <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
                        {loading ? 'Bezig...' : 'Inloggen'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '24px', fontSize: '13px', color: 'var(--muted)' }}>
                    Nog geen account? <Link href="/register" style={{ color: 'var(--primary)' }}>Registreren</Link>
                </p>
            </div>
        </div>
    );
}
