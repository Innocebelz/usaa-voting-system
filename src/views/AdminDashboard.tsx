import React, { useState, useEffect, useRef } from 'react';
import { ELECTION_DATA } from '../constants';
import { useNavigate } from 'react-router-dom';
import { Loader2, TrendingUp, Users, Download, Lock, Unlock, LogOut, RefreshCw } from 'lucide-react';

const BACKEND_URL = 'https://laa-voting-system.onrender.com';

interface TurnoutData {
    total_eligible:     number;
    votes_cast:         number;
    turnout_percentage: number;
}

// Raw tally from backend — only candidates with at least 1 vote appear here
interface TallyData {
    [position: string]: { candidate_id: string; votes: number }[];
}

// ── Animated count-up hook ────────────────────────────────────────────────
function useCountUp(target: number, duration = 1000, delay = 0) {
    const [value, setValue]   = useState(0);
    const rafRef   = useRef<number>(0);
    const startRef = useRef<number | null>(null);

    useEffect(() => {
        if (target === 0) { setValue(0); return; }
        const timeout = setTimeout(() => {
            startRef.current = null;
            const step = (ts: number) => {
                if (!startRef.current) startRef.current = ts;
                const p = Math.min((ts - startRef.current) / duration, 1);
                setValue(Math.round((1 - Math.pow(1 - p, 3)) * target));
                if (p < 1) rafRef.current = requestAnimationFrame(step);
            };
            rafRef.current = requestAnimationFrame(step);
        }, delay);
        return () => { clearTimeout(timeout); cancelAnimationFrame(rafRef.current); };
    }, [target, duration, delay]);

    return value;
}

const AdminDashboard: React.FC = () => {
    const [turnout, setTurnout]               = useState<TurnoutData | null>(null);
    const [tally, setTally]                   = useState<TallyData | null>(null);
    const [isElectionOpen, setIsElectionOpen] = useState<boolean>(true);
    const [loading, setLoading]               = useState(true);
    const [actionLoading, setActionLoading]   = useState(false);
    const [lastRefreshed, setLastRefreshed]   = useState<Date | null>(null);
    const [visible, setVisible]               = useState(false);
    const [confirmToggle, setConfirmToggle]   = useState(false);
    const navigate = useNavigate();

    // Fade-in on mount
    useEffect(() => {
        const t = setTimeout(() => setVisible(true), 30);
        return () => clearTimeout(t);
    }, []);

    // Animated stats
    const animEligible = useCountUp(turnout?.total_eligible      ?? 0, 1000, 300);
    const animCast     = useCountUp(turnout?.votes_cast          ?? 0, 1000, 400);
    const animPct      = useCountUp(turnout?.turnout_percentage  ?? 0, 1200, 500);

    const getAuthHeaders = (): HeadersInit => {
        const token = sessionStorage.getItem('laa_admin_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const handleSessionExpired = () => {
        sessionStorage.removeItem('laa_admin_token');
        navigate('/admin/login', { replace: true });
    };

    const fetchAdminData = async () => {
        try {
            const [turnoutRes, tallyRes, statusRes] = await Promise.all([
                fetch(`${BACKEND_URL}/api/results/turnout`),
                fetch(`${BACKEND_URL}/api/admin/tally`,  { headers: getAuthHeaders() }),
                fetch(`${BACKEND_URL}/api/admin/status`, { headers: getAuthHeaders() }),
            ]);

            if (tallyRes.status === 401 || statusRes.status === 401) {
                handleSessionExpired(); return;
            }

            if (turnoutRes.ok && tallyRes.ok && statusRes.ok) {
                const [td, tj, sj] = await Promise.all([
                    turnoutRes.json(), tallyRes.json(), statusRes.json(),
                ]);
                if (td.status === 'success') setTurnout(td);
                if (tj.status === 'success') setTally(tj.data);
                if (sj.status === 'success') setIsElectionOpen(sj.election_open);
                setLastRefreshed(new Date());
            }
        } catch (err) {
            console.error('Failed to connect to backend:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminData();
        const interval = setInterval(fetchAdminData, 10000);
        return () => clearInterval(interval);
    }, []);

    // ── Helpers ───────────────────────────────────────────────────────────

    // For each position in ELECTION_DATA, merge in live vote counts from tally.
    // Uses dbKey for matching — safe even when position names contain commas/special chars.
    const buildPositionResults = (dbKey: string) => {
        const category  = ELECTION_DATA.find(c => c.dbKey === dbKey);
        if (!category) return null;

        const rawVotes  = tally?.[dbKey] ?? [];
        const voteMap   = Object.fromEntries(rawVotes.map(r => [r.candidate_id, r.votes]));

        const candidates = category.candidates.map(c => ({
            id:     c.id,
            name:   c.name,
            image:  c.image,
            votes:  voteMap[c.id] ?? 0,
        })).sort((a, b) => b.votes - a.votes);

        const total = candidates.reduce((s, c) => s + c.votes, 0);
        return { label: category.position, candidates, total };
    };

    const toggleElectionStatus = async () => {
        setConfirmToggle(false);
        setActionLoading(true);
        try {
            const res = await fetch(`${BACKEND_URL}/api/admin/status`, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
                body:    JSON.stringify({ election_open: !isElectionOpen }),
            });
            if (res.status === 401) { handleSessionExpired(); return; }
            const data = await res.json();
            if (data.status === 'success') setIsElectionOpen(data.election_open);
        } catch (err) {
            console.error('Failed to toggle election status:', err);
        } finally {
            setActionLoading(false);
        }
    };

    const handleExit = () => {
        sessionStorage.removeItem('laa_admin_token');
        navigate('/login');
    };

    const downloadCSV = () => {
        if (!tally) return;
        let csv = 'Position,Candidate,Votes\n';
        Object.keys(tally).forEach(posKey => {
            const result = buildPositionResults(posKey);
            if (!result) return;
            result.candidates.forEach(c => {
                csv += `"${result.label}","${c.name}",${c.votes}\n`;
            });
        });
        const link  = document.createElement('a');
        link.href   = encodeURI('data:text/csv;charset=utf-8,' + csv);
        link.setAttribute('download', `ussa_results_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    // ── Loading state ─────────────────────────────────────────────────────

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center flex-1 gap-4 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin text-yellow-500" />
                <p className="text-xs font-black uppercase tracking-widest">Loading Election Data...</p>
            </div>
        );
    }

    // Arc for the turnout ring
    const R       = 15.9155;
    const CIRCUMF = 2 * Math.PI * R;
    const offset  = CIRCUMF - (animPct / 100) * CIRCUMF;

    // dbKey is the exact Postgres column name — no derivation needed
    const positionKeys = ELECTION_DATA.map(c => c.dbKey);

    return (
        <div
            className={`w-full max-w-5xl mx-auto pt-6 pb-16 transition-all duration-500 ${
                visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
            }`}
        >
            {/* ── Page header ────────────────────────────────────────────── */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mb-8 gap-4 border-b-2 border-zinc-200 pb-6">
                <div>
                    <span className="text-[10px] font-black bg-zinc-900 text-yellow-400 px-3 py-1 rounded-full uppercase tracking-widest mb-3 inline-block border border-yellow-500">
                        Secure Area
                    </span>
                    <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 tracking-tight uppercase">
                        Election Control Center
                    </h1>
                    {lastRefreshed && (
                        <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-1.5 flex items-center gap-1.5">
                            <RefreshCw className="w-3 h-3" />
                            Last refreshed {lastRefreshed.toLocaleTimeString()}
                            <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse inline-block ml-1" />
                        </p>
                    )}
                </div>
                <button
                    onClick={handleExit}
                    className="flex items-center gap-2 text-sm font-black text-zinc-400 hover:text-zinc-800 transition-colors uppercase tracking-wider"
                >
                    <LogOut className="w-4 h-4" />
                    Exit
                </button>
            </div>

            {/* ── Control bar ────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden mb-8">
                <div className="h-1 bg-zinc-900 w-full" />
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4">

                    {/* Status */}
                    <div className="flex items-center gap-3">
                        <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                            isElectionOpen ? 'bg-green-500 animate-pulse' : 'bg-red-500'
                        }`} />
                        <div>
                            <p className="font-black text-zinc-800 uppercase tracking-wider text-sm leading-none">
                                {isElectionOpen ? 'Accepting Votes' : 'Election Closed'}
                            </p>
                            <p className="text-[10px] text-zinc-400 font-bold uppercase tracking-widest mt-0.5">
                                {isElectionOpen ? 'Voters can submit ballots' : 'No new votes accepted'}
                            </p>
                        </div>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">

                        {/* Export CSV */}
                        <button
                            onClick={downloadCSV}
                            disabled={!tally}
                            className="flex items-center justify-center gap-2 bg-zinc-900 hover:bg-zinc-800 text-white px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all border-b-4 border-zinc-700 active:border-b-0 active:scale-95 disabled:opacity-40"
                        >
                            <Download className="w-4 h-4 text-yellow-400" />
                            Export CSV
                        </button>

                        {/* Toggle election — inline confirm prevents accidental clicks */}
                        {confirmToggle ? (
                            <div className="flex gap-2">
                                <button
                                    onClick={toggleElectionStatus}
                                    disabled={actionLoading}
                                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all border-b-4 active:border-b-0 active:scale-95 disabled:opacity-50 ${
                                        isElectionOpen
                                            ? 'bg-red-600 text-white border-red-800 hover:bg-red-700'
                                            : 'bg-green-600 text-white border-green-800 hover:bg-green-700'
                                    }`}
                                >
                                    {actionLoading
                                        ? <Loader2 className="w-4 h-4 animate-spin" />
                                        : isElectionOpen
                                            ? <><Lock className="w-4 h-4" /> Yes, Close</>
                                            : <><Unlock className="w-4 h-4" /> Yes, Open</>
                                    }
                                </button>
                                <button
                                    onClick={() => setConfirmToggle(false)}
                                    className="px-4 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest bg-zinc-100 text-zinc-600 border-b-4 border-zinc-200 hover:bg-zinc-200 active:border-b-0 transition-all"
                                >
                                    Cancel
                                </button>
                            </div>
                        ) : (
                            <button
                                onClick={() => setConfirmToggle(true)}
                                className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black uppercase tracking-widest transition-all border-2 active:scale-95 ${
                                    isElectionOpen
                                        ? 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                                        : 'border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                }`}
                            >
                                {isElectionOpen
                                    ? <><Lock className="w-4 h-4" /> Close Election</>
                                    : <><Unlock className="w-4 h-4" /> Open Election</>
                                }
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {/* ── Turnout stats ───────────────────────────────────────────── */}
            {turnout && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-8">

                    {/* Total eligible */}
                    <div className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden">
                        <div className="h-1 bg-zinc-200" />
                        <div className="p-6 flex flex-col items-center text-center">
                            <Users className="w-6 h-6 text-zinc-300 mb-2" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                                Total Eligible
                            </span>
                            <span className="text-5xl font-black text-zinc-900 tabular-nums">
                                {animEligible}
                            </span>
                        </div>
                    </div>

                    {/* Votes cast — dark highlight card */}
                    <div className="bg-zinc-900 rounded-2xl border-2 border-zinc-900 overflow-hidden">
                        <div className="h-1 bg-yellow-500" />
                        <div className="p-6 flex flex-col items-center text-center">
                            <TrendingUp className="w-6 h-6 text-yellow-400 mb-2" />
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest mb-1">
                                Votes Cast
                            </span>
                            <span className="text-5xl font-black text-white tabular-nums">
                                {animCast}
                            </span>
                        </div>
                    </div>

                    {/* Turnout ring */}
                    <div className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden">
                        <div className="h-1 bg-yellow-500" />
                        <div className="p-6 flex flex-col items-center text-center">
                            <div className="relative w-24 h-24 mb-1">
                                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                                    <circle cx="18" cy="18" r={R} fill="none" stroke="#f4f4f5" strokeWidth="3.5" />
                                    <circle
                                        cx="18" cy="18" r={R}
                                        fill="none" stroke="#eab308" strokeWidth="3.5"
                                        strokeLinecap="round"
                                        strokeDasharray={`${CIRCUMF} ${CIRCUMF}`}
                                        strokeDashoffset={offset}
                                        style={{ transition: 'stroke-dashoffset 0.05s linear' }}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-xl font-black text-zinc-900 tabular-nums">
                                        {animPct}%
                                    </span>
                                </div>
                            </div>
                            <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                Turnout Rate
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Live tally ──────────────────────────────────────────────── */}
            <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-black text-zinc-900 tracking-tight uppercase">
                    Live Vote Tally
                </h2>
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                        Auto-refreshing every 10s
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {positionKeys.map(posKey => {
                    const result = buildPositionResults(posKey);
                    if (!result) return null;
                    const { label, candidates, total } = result;

                    return (
                        <div key={posKey} className="bg-white rounded-2xl border-2 border-zinc-200 overflow-hidden">
                            <div className="h-1 bg-yellow-500" />
                            <div className="p-5">

                                {/* Position label + vote total */}
                                <div className="flex items-center justify-between mb-4 pb-3 border-b-2 border-zinc-100">
                                    <h3 className="text-sm font-black text-zinc-800 uppercase tracking-widest">
                                        {label}
                                    </h3>
                                    <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest">
                                        {total} vote{total !== 1 ? 's' : ''}
                                    </span>
                                </div>

                                {total === 0 ? (
                                    /* No votes yet state */
                                    <div className="py-4 text-center">
                                        <p className="text-sm text-zinc-400 font-bold italic">
                                            No votes recorded yet.
                                        </p>
                                        <div className="mt-3 space-y-2">
                                            {candidates.map(c => (
                                                <div key={c.id} className="flex items-center gap-3 px-2 py-2 rounded-lg bg-zinc-50">
                                                    <img
                                                        src={c.image}
                                                        alt={c.name}
                                                        onError={(e) => {
                                                            (e.target as HTMLImageElement).src =
                                                                `https://ui-avatars.com/api/?name=${encodeURIComponent(c.name)}&background=18181b&color=eab308&size=64`;
                                                        }}
                                                        className="w-8 h-8 rounded-full object-cover border-2 border-zinc-200 shrink-0"
                                                    />
                                                    <span className="text-sm font-black text-zinc-400 truncate">{c.name}</span>
                                                    <span className="ml-auto text-sm font-black text-zinc-300">—</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ) : (
                                    /* Results rows */
                                    <div className="space-y-4">
                                        {candidates.map((candidate, index) => {
                                            const pct       = total > 0 ? Math.round((candidate.votes / total) * 100) : 0;
                                            const isLeading = index === 0 && candidate.votes > 0;

                                            return (
                                                <div key={candidate.id}>
                                                    <div className="flex items-center gap-3 mb-1.5">

                                                        {/* Rank badge */}
                                                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 ${
                                                            isLeading
                                                                ? 'bg-yellow-400 text-zinc-900'
                                                                : 'bg-zinc-100 text-zinc-500'
                                                        }`}>
                                                            {index + 1}
                                                        </span>

                                                        {/* Photo */}
                                                        <img
                                                            src={candidate.image}
                                                            alt={candidate.name}
                                                            onError={(e) => {
                                                                (e.target as HTMLImageElement).src =
                                                                    `https://ui-avatars.com/api/?name=${encodeURIComponent(candidate.name)}&background=18181b&color=eab308&size=64`;
                                                            }}
                                                            className={`w-9 h-9 rounded-full object-cover border-2 shrink-0 ${
                                                                isLeading ? 'border-yellow-400' : 'border-zinc-200'
                                                            }`}
                                                        />

                                                        {/* Name */}
                                                        <span className={`font-black text-sm flex-1 truncate uppercase ${
                                                            isLeading ? 'text-zinc-900' : 'text-zinc-500'
                                                        }`}>
                                                            {candidate.name}
                                                        </span>

                                                        {/* Votes + pct */}
                                                        <div className="text-right shrink-0">
                                                            <span className={`text-xl font-black tabular-nums ${
                                                                isLeading ? 'text-yellow-600' : 'text-zinc-400'
                                                            }`}>
                                                                {candidate.votes}
                                                            </span>
                                                            <span className="text-[10px] font-bold text-zinc-400 ml-1 uppercase">
                                                                {pct}%
                                                            </span>
                                                        </div>
                                                    </div>

                                                    {/* Vote bar */}
                                                    <div className="ml-9 h-2 bg-zinc-100 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full transition-all duration-700 ease-out ${
                                                                isLeading ? 'bg-yellow-400' : 'bg-zinc-300'
                                                            }`}
                                                            style={{ width: `${pct}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default AdminDashboard;
