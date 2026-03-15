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
            background: 'var(--background)',
        }}>
            <div className="card" style={{ width: '100%', maxWidth: '400px' }}>
                <div style={{ textAlign: 'center', marginBottom: '28px' }}>
                    <div style={{ fontWeight: 700, fontSize: '22px', marginBottom: '4px' }}>Bonai</div>
                    <p style={{ color: 'var(--muted)', fontSize: '14px' }}>
                        Inloggen bij PDF naar UBL Converter
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'var(--danger-light)', border: '1px solid rgba(220, 38, 38, 0.15)',
                        borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
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
                            placeholder="Uw wachtwoord"
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

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
                    Nog geen account? <Link href="/register" style={{ color: 'var(--primary)' }}>Registreren</Link>
                </p>
            </div>
        </div>
    );
}
