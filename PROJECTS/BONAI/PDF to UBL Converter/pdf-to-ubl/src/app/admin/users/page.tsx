'use client';

import { useEffect, useState } from 'react';
import { CircleAlert as AlertCircle } from 'lucide-react';

interface UserItem {
    id: string;
    email: string;
    name: string | null;
    role: string;
    createdAt: string;
    conversionsCount: number;
}

export default function AdminUsersPage() {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [newUser, setNewUser] = useState({ email: '', name: '', password: '', role: 'USER' });
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        const res = await fetch('/api/admin/users');
        if (res.ok) setUsers(await res.json());
        setLoading(false);
    };

    const createUser = async () => {
        setCreating(true);
        setError('');
        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUser),
        });
        if (res.ok) {
            setShowCreate(false);
            setNewUser({ email: '', name: '', password: '', role: 'USER' });
            loadUsers();
        } else {
            const data = await res.json();
            setError(data.message || 'Fout bij aanmaken');
        }
        setCreating(false);
    };

    const updateRole = async (userId: string, role: string) => {
        await fetch('/api/admin/users', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userId, role }),
        });
        loadUsers();
    };

    const roleBadge = (role: string) => {
        const map: Record<string, string> = { ADMIN: 'badge-danger', USER: 'badge-info', VIEWER: 'badge-warning' };
        return <span className={`badge ${map[role] || 'badge-info'}`}>{role}</span>;
    };

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 600, marginBottom: '6px' }}>Gebruikersbeheer</h1>
                    <p style={{ color: 'var(--muted)', fontSize: '14px' }}>Beheer gebruikers en rollen binnen uw organisatie.</p>
                </div>
                <button onClick={() => setShowCreate(!showCreate)} className="btn-primary">+ Gebruiker Toevoegen</button>
            </div>

            {showCreate && (
                <div className="card" style={{ marginBottom: '24px' }}>
                    <h2 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Nieuwe Gebruiker</h2>
                    {error && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--danger)', marginBottom: '12px', fontSize: '13px' }}>
                            <AlertCircle size={14} /> {error}
                        </div>
                    )}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                        <div>
                            <label className="label">E-mail</label>
                            <input className="input" type="email" value={newUser.email}
                                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Naam</label>
                            <input className="input" value={newUser.name}
                                onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Wachtwoord</label>
                            <input className="input" type="password" value={newUser.password}
                                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} />
                        </div>
                        <div>
                            <label className="label">Rol</label>
                            <select className="input" value={newUser.role}
                                onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}>
                                <option value="USER">User</option>
                                <option value="ADMIN">Admin</option>
                                <option value="VIEWER">Viewer</option>
                            </select>
                        </div>
                    </div>
                    <button onClick={createUser} className="btn-primary" disabled={creating} style={{ marginTop: '12px' }}>
                        {creating ? 'Aanmaken...' : 'Gebruiker Aanmaken'}
                    </button>
                </div>
            )}

            <div className="card">
                {loading ? (
                    <div style={{ textAlign: 'center', padding: '32px' }}><div className="spinner" style={{ margin: '0 auto' }} /></div>
                ) : (
                    <table className="table">
                        <thead>
                            <tr>
                                <th>Naam</th>
                                <th>E-mail</th>
                                <th>Rol</th>
                                <th>Conversies</th>
                                <th>Sinds</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.map(u => (
                                <tr key={u.id}>
                                    <td style={{ fontWeight: 500 }}>{u.name || '—'}</td>
                                    <td>{u.email}</td>
                                    <td>{roleBadge(u.role)}</td>
                                    <td>{u.conversionsCount}</td>
                                    <td style={{ color: 'var(--muted)', fontSize: '13px' }}>
                                        {new Date(u.createdAt).toLocaleDateString('nl-NL')}
                                    </td>
                                    <td>
                                        <select className="input" value={u.role} style={{ padding: '4px 8px', fontSize: '12px', width: 'auto' }}
                                            onChange={(e) => updateRole(u.id, e.target.value)}>
                                            <option value="ADMIN">Admin</option>
                                            <option value="USER">User</option>
                                            <option value="VIEWER">Viewer</option>
                                        </select>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
