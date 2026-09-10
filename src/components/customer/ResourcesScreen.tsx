import React, { useState, useEffect } from 'react';
import { api } from '../../services/api';
import { CommunityResource, ResourceCategory } from '../../types';
import { 
  HeartHandshake, 
  Phone, 
  MapPin, 
  Clock, 
  ExternalLink, 
  ShieldAlert, 
  Search,
  CheckCircle2
} from 'lucide-react';

const CATEGORIES: { id: ResourceCategory | 'ALL'; label: string }[] = [
  { id: 'ALL', label: 'ALL SERVICES' },
  { id: 'HEALTHCARE', label: 'HEALTHCARE & ER' },
  { id: 'SHELTER', label: 'SHELTER & WARMING' },
  { id: 'FOOD', label: 'FOOD PANTRIES' },
  { id: 'HARM_REDUCTION', label: 'HARM REDUCTION' },
  { id: 'CRISIS', label: 'CRISIS & 24/7 HELPLINES' }
];

export const ResourcesScreen: React.FC = () => {
  const [resources, setResources] = useState<CommunityResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<ResourceCategory | 'ALL'>('ALL');
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadResources();
  }, []);

  const loadResources = async () => {
    try {
      setLoading(true);
      const data = await api.getResources();
      setResources(data);
    } catch (err) {
      console.error('Failed to load resources:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = (resources || []).filter(res => {
    if (selectedCategory !== 'ALL' && res.category !== selectedCategory) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      const services = res.services || [];
      return (
        res.name?.toLowerCase().includes(q) ||
        res.description?.toLowerCase().includes(q) ||
        services.some(s => s.toLowerCase().includes(q))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono-code font-bold bg-rose-500 text-white px-2 py-0.5 rounded uppercase">
            MANCHESTER, NH DIRECTORY
          </span>
          <span className="text-xs font-mono-code text-stone-400">COMMUNITY NETWORK</span>
        </div>
        <h1 className="font-display font-black text-2xl text-white uppercase tracking-wider mt-1">
          Community Resources
        </h1>
        <p className="text-xs text-stone-400 font-mono-code">
          Emergency, healthcare, warming shelters, and harm reduction in Manchester
        </p>
      </div>

      {/* Emergency Notice */}
      <div className="p-4 bg-rose-950/60 border border-rose-500/50 rounded-2xl flex items-start gap-3 text-xs text-rose-200">
        <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <span className="font-bold font-mono-code text-rose-300 uppercase">
            Emergency & Crisis Access
          </span>
          <p className="leading-relaxed text-stone-300">
            For acute life threats, call <strong>911</strong>. For suicide & crisis support, call <strong>988</strong>. 247 connects neighbors with free public community infrastructure.
          </p>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search healthcare, food, shelters, harm reduction..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-9 pr-4 py-2.5 text-xs text-white placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono-code"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono-code font-bold whitespace-nowrap border transition-colors ${
                selectedCategory === cat.id
                  ? 'bg-amber-500 text-stone-950 border-amber-400'
                  : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Resources Cards List */}
      <div className="space-y-3">
        {filtered.map(res => (
          <div
            key={res.id}
            className="p-4 bg-stone-900 border border-stone-800 rounded-xl space-y-3 hover:border-stone-700 transition-all"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <span className="text-[10px] font-mono-code font-bold text-amber-400 uppercase">
                  {res.category.replace(/_/g, ' ')}
                </span>
                <h3 className="font-bold text-sm text-white">{res.name}</h3>
                <p className="text-xs text-stone-300 mt-1 leading-relaxed">{res.description}</p>
              </div>

              {res.free_services && (
                <span className="shrink-0 bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[10px] font-mono-code font-bold px-2 py-0.5 rounded">
                  100% FREE
                </span>
              )}
            </div>

            {/* Service Tags */}
            <div className="flex flex-wrap gap-1">
              {(res.services || []).map((srv, idx) => (
                <span key={idx} className="text-[10px] bg-stone-950 text-stone-300 px-2 py-0.5 rounded border border-stone-800 font-mono-code">
                  • {srv}
                </span>
              ))}
            </div>

            {/* Contact details & action links */}
            <div className="pt-3 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono-code">
              <div className="space-y-1 text-stone-400 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-amber-400" />
                  <span>{res.address}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-stone-500" />
                  <span>{res.hours}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={`tel:${res.phone}`}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center gap-1.5 shadow"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call {res.phone}</span>
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
