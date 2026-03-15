'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function RegisterPage() {
    const router = useRouter();
    const [formData, setFormData] = useState({
        organizationName: '',
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
    });
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        if (formData.password !== formData.confirmPassword) {
            setError('Wachtwoorden komen niet overeen');
            setLoading(false);
            return;
        }

        if (formData.password.length < 8) {
            setError('Wachtwoord moet minimaal 8 tekens bevatten');
            setLoading(false);
            return;
        }

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    organizationName: formData.organizationName,
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                }),
            });

            if (!res.ok) {
                const data = await res.json();
                setError(data.message || 'Registratie mislukt');
                setLoading(false);
                return;
            }

            router.push('/login?registered=true');
        } catch {
            setError('Er is een fout opgetreden');
            setLoading(false);
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
                        Start met 1000 gratis credits
                    </p>
                </div>

                {error && (
                    <div style={{
                        background: 'var(--danger-light)', border: '1px solid rgba(220, 38, 38, 0.15)',
                        borderRadius: '8px', padding: '10px 14px', marginBottom: '20px',
                        color: 'var(--danger)', fontSize: '13px', textAlign: 'center',
                    }}>{error}</div>
                )}

                <form onSubmit={handleSubmit}>
                    <div style={{ marginBottom: '16px' }}>
                        <label className="label">Organisatienaam</label>
                        <input type="text" className="input" placeholder="Uw bedrijfsnaam"
                            value={formData.organizationName} required
                            onChange={(e) => setFormData({ ...formData, organizationName: e.target.value })} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label className="label">Uw naam</label>
                        <input type="text" className="input" placeholder="Volledige naam"
                            value={formData.name} required
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label className="label">E-mailadres</label>
                        <input type="email" className="input" placeholder="uw@email.nl"
                            value={formData.email} required
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div style={{ marginBottom: '16px' }}>
                        <label className="label">Wachtwoord</label>
                        <input type="password" className="input" placeholder="Min. 8 tekens"
                            value={formData.password} required
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <div style={{ marginBottom: '24px' }}>
                        <label className="label">Wachtwoord bevestigen</label>
                        <input type="password" className="input" placeholder="Nogmaals uw wachtwoord"
                            value={formData.confirmPassword} required
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })} />
                    </div>
                    <button type="submit" className="btn-primary" disabled={loading}
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                        {loading && <div className="spinner" style={{ width: '16px', height: '16px', borderWidth: '2px' }} />}
                        {loading ? 'Bezig...' : 'Account Aanmaken'}
                    </button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '13px', color: 'var(--muted)' }}>
                    Al een account? <Link href="/login" style={{ color: 'var(--primary)' }}>Inloggen</Link>
                </p>
            </div>
        </div>
    );
}
