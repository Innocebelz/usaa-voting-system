import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ShieldAlert } from 'lucide-react';

// FIX: Point directly to your live Render backend
const BACKEND_URL = 'https://laa-voting-system.onrender.com';

const AdminLogin: React.FC = () => {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!password) {
            setError('Admin password is required.');
            return;
        }

        try {
            setError('');
            setLoading(true);

            const res = await fetch(`${BACKEND_URL}/api/admin/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ password })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                throw new Error(data.detail || 'Login failed.');
            }

            // sessionStorage (not localStorage): the admin session clears itself
            // when the browser tab closes, which matters if this is opened on a
            // shared/public computer to manage the election.
            sessionStorage.setItem('laa_admin_token', data.token);
            navigate('/admin');
        } catch (err: any) {
            setError(err.message || 'Incorrect password.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full max-w-sm mx-auto bg-white p-8 rounded-xl shadow-sm border-2 border-slate-200 self-center">
            <div className="text-center mb-8">
                <div className="flex items-center justify-center w-12 h-12 bg-amber-100 rounded-full mb-4 mx-auto border-2 border-amber-200">
                    <ShieldAlert className="h-6 w-6 text-amber-600" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Admin Access</h1>
                <p className="text-slate-500 mt-2 text-sm font-medium">Enter the election control center password.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <label htmlFor="adminPassword" className="block text-xs font-bold uppercase tracking-wider text-slate-900 mb-2">
                        Password
                    </label>
                    <input
                        type="password"
                        id="adminPassword"
                        autoFocus
                        className={`block w-full rounded-md border-2 py-3 px-4 text-slate-900 shadow-sm ${
                            error ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 outline-none'
                        } placeholder:text-slate-400 sm:text-sm sm:leading-6 transition-colors`}
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        disabled={loading}
                    />
                    {error && <p className="mt-2 text-sm text-red-600 font-medium">{error}</p>}
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full flex justify-center items-center rounded-lg bg-slate-900 px-3 py-4 text-sm font-bold text-white shadow-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors border-b-4 border-slate-700 active:border-b-0 uppercase tracking-wide"
                >
                    {loading ? (
                        <>
                            <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5" />
                            Verifying...
                        </>
                    ) : (
                        'Enter Control Center'
                    )}
                </button>
            </form>
        </div>
    );
};

export default AdminLogin;
