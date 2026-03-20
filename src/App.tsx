import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Calendar as CalendarIcon, 
  BarChart3, 
  Settings, 
  Sparkles,
  ChevronRight,
  Plus,
  Search,
  Bell,
  User as UserIcon,
  Loader2,
  Send,
  Users,
  Edit2,
  Trash2,
  X,
  Check,
  MoreVertical,
  LogOut,
  LogIn
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Client, Post } from './types';
import { 
  auth, 
  db, 
  loginWithGoogle, 
  logout, 
  User,
  onAuthStateChanged
} from './firebase';
import { 
  collection, 
  onSnapshot, 
  doc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  addDoc,
  query,
  where,
  getDoc
} from 'firebase/firestore';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Error Handling ---

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// --- Components ---

const SidebarItem = ({ icon: Icon, label, active, onClick }: { icon: any, label: string, active?: boolean, onClick: () => void }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
      active ? "bg-black text-white shadow-md" : "text-gray-500 hover:bg-gray-100 hover:text-black"
    )}
  >
    <Icon size={20} className={cn(active ? "text-white" : "text-gray-400 group-hover:text-black")} />
    <span className="font-medium text-sm">{label}</span>
  </button>
);

const Card = ({ children, title, className }: { children: React.ReactNode, title?: string, className?: string }) => (
  <div className={cn("glass-card p-6", className)}>
    {title && <h3 className="text-lg font-semibold mb-4 flex items-center justify-between">{title}</h3>}
    {children}
  </div>
);

// --- Views ---

const DashboardView = ({ client, onAddPost, onEditPost }: { client: Client, onAddPost: () => void, onEditPost: (post: Post) => void }) => {
  const m = client.modeling;
  const totalQty = (m.heroQty || 0) + (m.hubQty || 0) + (m.helpQty || 0) + (m.mistoQty || 0);
  const getPct = (qty: number) => totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0;

  const heroPct = getPct(m.heroQty || 0);
  const hubPct = getPct(m.hubQty || 0);
  const helpPct = getPct(m.helpQty || 0);
  const mistoPct = getPct(m.mistoQty || 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard: {client.name}</h1>
          <p className="text-gray-500">Sua estratégia de conteúdo, simplificada e inteligente.</p>
        </div>
        <button 
          onClick={onAddPost}
          className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-colors"
        >
          <Plus size={18} />
          Novo Planejamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Equilíbrio de Modelagem">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">HERO (Impacto)</span>
              <span className="font-mono font-bold">{heroPct}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full" style={{ width: `${heroPct}%` }} />
            </div>
            
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">HUB (Conexão)</span>
              <span className="font-mono font-bold">{hubPct}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-emerald-500 h-full" style={{ width: `${hubPct}%` }} />
            </div>

            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">HELP (Utilidade)</span>
              <span className="font-mono font-bold">{helpPct}%</span>
            </div>
            <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-amber-500 h-full" style={{ width: `${helpPct}%` }} />
            </div>
          </div>
        </Card>

        <Card title={`Rede Primária: ${client.strategy.primaryNetwork}`}>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 rounded-xl border border-blue-100">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-1">Foco Atual</p>
              <p className="text-sm font-medium">Crescimento Orgânico via Reels</p>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Posts esta semana</span>
              <span className="font-bold">{client.posts.length}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Aderência</span>
              <span className="text-emerald-600 font-bold">{m.adherenceQty > 7 ? 'Alta' : 'Média'}</span>
            </div>
          </div>
        </Card>

        <Card title="Status da Estratégia">
          <div className="space-y-3">
            <div className="flex gap-3 items-start p-3 bg-blue-50 rounded-xl border border-blue-100">
              <Check className="text-blue-600 shrink-0" size={18} />
              <p className="text-xs text-blue-900 leading-relaxed">
                {helpPct > 40 
                  ? "Sua estratégia está bem equilibrada. Continue focando em conteúdos HELP para manter a base engajada."
                  : "Atenção: Aumente a produção de conteúdo HELP para fortalecer sua base de seguidores."}
              </p>
            </div>
            {heroPct > 25 && (
              <div className="flex gap-3 items-start p-3 bg-amber-50 rounded-xl border border-amber-100">
                <Bell className="text-amber-600 shrink-0" size={18} />
                <p className="text-xs text-amber-900 leading-relaxed">
                  Muitos conteúdos HERO podem saturar sua audiência. Tente diluir com mais HUB.
                </p>
              </div>
            )}
          </div>
        </Card>
      </div>

    <Card title="Cronograma Recente">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead>
            <tr className="text-xs text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <th className="pb-3 font-medium">Conteúdo</th>
              <th className="pb-3 font-medium">Plataforma</th>
              <th className="pb-3 font-medium">Formato</th>
              <th className="pb-3 font-medium">Status</th>
              <th className="pb-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {client.posts.map((item, i) => (
              <tr key={i} className="group hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => onEditPost(item)}>
                <td className="py-4 text-sm font-medium">{item.title}</td>
                <td className="py-4 text-sm text-gray-500">{item.platform}</td>
                <td className="py-4 text-sm text-gray-500">{item.format}</td>
                <td className="py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                    item.type === 'HERO' ? "bg-blue-100 text-blue-700" : 
                    item.type === 'HUB' ? "bg-emerald-100 text-emerald-700" : 
                    "bg-amber-100 text-amber-700"
                  )}>
                    {item.type}
                  </span>
                </td>
                <td className="py-4 text-right">
                  <button className="text-gray-400 hover:text-black opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight size={18} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  </div>
  );
};

const COBOView = ({ 
  client, 
  onEditStrategy, 
  onAddFormat, 
  onEditFormat 
}: { 
  client: Client, 
  onEditStrategy: () => void, 
  onAddFormat: () => void, 
  onEditFormat: (format: { name: string; desc: string }, index: number) => void 
}) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Content Board: {client.name}</h1>
          <p className="text-gray-500">Defina sua estrutura de redes e formatos.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Rede Primária" className="border-l-4 border-l-blue-500">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
              <button 
                onClick={onEditStrategy}
                className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all"
              >
                <Edit2 size={12} />
              </button>
              <h4 className="font-bold text-sm mb-1 uppercase">{client.strategy.primaryNetwork}</h4>
              <p className="text-xs text-gray-500 mb-3">Foco total em engajamento e autoridade.</p>
              <div className="flex flex-wrap gap-2">
                {client.strategy.secondaryNetworks.map(net => (
                  <span key={net} className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-medium">{net}</span>
                ))}
              </div>
            </div>
            <button 
              onClick={onEditStrategy}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Editar Redes
            </button>
          </div>
        </Card>

        <Card title="Redes Paralelas" className="border-l-4 border-l-amber-500">
          <div className="space-y-4">
            <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 relative group">
              <button 
                onClick={onEditStrategy}
                className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all"
              >
                <Edit2 size={12} />
              </button>
              <h4 className="font-bold text-sm mb-1 uppercase">{client.strategy.tertiaryNetworks[0] || 'TIK TOK'}</h4>
              <p className="text-xs text-gray-500 mb-3">Distribuição de conteúdo viral.</p>
              <div className="flex flex-wrap gap-2">
                {client.strategy.tertiaryNetworks.slice(1).map(net => (
                  <span key={net} className="px-2 py-1 bg-white border border-gray-200 rounded text-[10px] font-medium">{net}</span>
                ))}
              </div>
            </div>
            <button 
              onClick={onEditStrategy}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-amber-500 hover:text-amber-500 transition-all flex items-center justify-center gap-2"
            >
              <Plus size={16} />
              Editar Redes
            </button>
          </div>
        </Card>

        <Card title="Formatos de Conteúdo">
          <div className="space-y-2">
            {client.strategy.contentFormats.map((format, i) => (
              <div 
                key={i} 
                onClick={() => onEditFormat(format, i)}
                className="p-3 hover:bg-gray-50 rounded-xl transition-colors cursor-pointer group relative"
              >
                <div className="absolute top-2 right-2 p-1 opacity-0 group-hover:opacity-100 hover:bg-gray-200 rounded transition-all">
                  <Edit2 size={12} />
                </div>
                <h4 className="font-bold text-sm group-hover:text-blue-600 transition-colors">{format.name}</h4>
                <p className="text-xs text-gray-500">{format.desc}</p>
              </div>
            ))}
            <button 
              onClick={onAddFormat}
              className="w-full py-3 border-2 border-dashed border-gray-200 rounded-xl text-gray-400 hover:border-blue-500 hover:text-blue-500 transition-all flex items-center justify-center gap-2 mt-2"
            >
              <Plus size={16} />
              Novo Formato
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
};

const ModelingView = ({ client, onEditModeling }: { client: Client, onEditModeling: () => void }) => {
  const m = client.modeling || {
    heroQty: 0, hubQty: 0, helpQty: 0, mistoQty: 0,
    adherenceQty: 0, depthQty: 0, postedDays: 0,
    currentPlatform: '',
    order: [], group: [],
    weeklySchedule: {}
  };

  const totalQty = (m.heroQty || 0) + (m.hubQty || 0) + (m.helpQty || 0) + (m.mistoQty || 0);
  const getPct = (qty: number) => totalQty > 0 ? Math.round((qty / totalQty) * 100) : 0;

  const heroPct = getPct(m.heroQty || 0);
  const hubPct = getPct(m.hubQty || 0);
  const helpPct = getPct(m.helpQty || 0);
  const mistoPct = getPct(m.mistoQty || 0);

  const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modelagem Sistemática: {client.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-gray-500">Equilibre sua matriz de conteúdo para sustentabilidade.</p>
            {m.currentPlatform && (
              <span className="px-2 py-0.5 bg-black text-white text-[10px] font-bold rounded-full uppercase">
                {m.currentPlatform}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase">Dias Postados</p>
            <p className="text-xl font-bold">{m.postedDays || 0}</p>
          </div>
          <button 
            onClick={onEditModeling}
            className="bg-black text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-gray-800 transition-colors"
          >
            <Edit2 size={18} />
            Editar Matriz
          </button>
        </div>
      </div>

      <Card title="Grade Semanal (COBO)">
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="p-3 border border-gray-200 text-left font-bold text-gray-400 uppercase text-[10px]">Dia</th>
                <th className="p-3 border border-gray-200 text-left font-bold text-gray-400 uppercase text-[10px]">Conteúdo</th>
                <th className="p-3 border border-gray-200 text-left font-bold text-gray-400 uppercase text-[10px]">Formato</th>
                <th className="p-3 border border-gray-200 text-left font-bold text-gray-400 uppercase text-[10px]">Horário</th>
              </tr>
            </thead>
            <tbody>
              {days.map(day => (
                <tr key={day} className="hover:bg-gray-50 transition-colors">
                  <td className="p-3 border border-gray-200 font-bold bg-gray-50/50">{day}</td>
                  <td className="p-3 border border-gray-200">{m.weeklySchedule?.[day]?.content || '---'}</td>
                  <td className="p-3 border border-gray-200">{m.weeklySchedule?.[day]?.format || '---'}</td>
                  <td className="p-3 border border-gray-200">{m.weeklySchedule?.[day]?.time || '---'}</td>
                </tr>
              ))}
              <tr className="bg-gray-100 font-bold">
                <td className="p-3 border border-gray-200">TOTAL</td>
                <td className="p-3 border border-gray-200" colSpan={3}>
                  {days.filter(day => m.weeklySchedule?.[day]?.content).length} Posts Planejados
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Equilíbrio (Modelagem)">
          <div className="h-64 flex items-end justify-around gap-4 pt-4">
            {[
              { label: 'HERO', qty: m.heroQty || 0, pct: heroPct, color: 'bg-blue-500' },
              { label: 'HUB', qty: m.hubQty || 0, pct: hubPct, color: 'bg-emerald-500' },
              { label: 'HELP', qty: m.helpQty || 0, pct: helpPct, color: 'bg-amber-500' },
              { label: 'MISTO', qty: m.mistoQty || 0, pct: mistoPct, color: 'bg-rose-500' },
            ].map((bar, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-2">
                <div className="text-[10px] font-bold text-gray-400">Qtd: {bar.qty}</div>
                <div className="text-xs font-bold">{bar.pct}%</div>
                <motion.div 
                  initial={{ height: 0 }}
                  animate={{ height: `${bar.pct * 2}px` }}
                  className={cn("w-full rounded-t-lg", bar.color)}
                />
                <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">{bar.label}</div>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Permeabilidade">
          <div className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Aderência (Frequência)</span>
                <span className="text-emerald-600">Qtd: {m.adherenceQty || 0}</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${Math.min(100, (m.adherenceQty || 0) * 10)}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm font-medium">
                <span>Profundidade (Qualidade)</span>
                <span className="text-blue-600">Qtd: {m.depthQty || 0}</span>
              </div>
              <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
                <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, (m.depthQty || 0) * 10)}%` }} />
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-xl">
              <p className="text-xs text-gray-500 leading-relaxed italic">
                "O objetivo da matriz é desenvolver planejamento relevante e sustentável. Sempre tendo mais HELP's e menos HERO's."
              </p>
            </div>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title="Ordem de Conteúdo">
          <div className="space-y-2">
            {(m.order || Array(10).fill('')).map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 w-6">{i + 1}º</span>
                <span className="text-sm font-medium">{item || '---'}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card title="Grupo de Conteúdo">
          <div className="space-y-2">
            {(m.group || Array(10).fill('')).map((item, i) => (
              <div key={i} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border border-gray-100">
                <span className="text-[10px] font-bold text-gray-400 w-6">{i + 1}º</span>
                <span className="text-sm font-medium">{item || '---'}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {m.observations && (
        <Card title="Observações">
          <div className="p-4 bg-gray-50 rounded-xl border border-gray-100">
            <p className="text-sm text-gray-600 whitespace-pre-wrap">{m.observations}</p>
          </div>
        </Card>
      )}
    </div>
  );
};

const PlanningView = ({ 
  client, 
  onAddPost, 
  onEditPost,
  onUpdatePost,
  currentWeekOffset,
  onWeekChange
}: { 
  client: Client, 
  onAddPost: (date: string, time: string) => void, 
  onEditPost: (post: Post) => void,
  onUpdatePost: (post: Post) => void,
  currentWeekOffset: number,
  onWeekChange: (offset: number) => void
}) => {
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const selectedPost = client.posts.find(p => p.id === selectedPostId);

  const colors = [
    { name: 'Azul', class: 'bg-blue-500' },
    { name: 'Verde', class: 'bg-emerald-500' },
    { name: 'Laranja', class: 'bg-amber-500' },
    { name: 'Rosa', class: 'bg-rose-500' },
    { name: 'Roxo', class: 'bg-violet-500' },
    { name: 'Cinza', class: 'bg-slate-500' },
    { name: 'Preto', class: 'bg-black' },
  ];

  const handleColorSelect = (colorClass: string) => {
    if (selectedPost) {
      onUpdatePost({ ...selectedPost, color: colorClass });
    }
  };

  const baseDate = new Date(2026, 2, 17); // March 17, 2026 (Monday)
  const currentMonday = new Date(baseDate);
  currentMonday.setDate(baseDate.getDate() + (currentWeekOffset * 7));

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(currentMonday);
    d.setDate(currentMonday.getDate() + i);
    const names = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    return {
      name: names[d.getDay()],
      date: d.getDate(),
      month: d.toLocaleString('default', { month: 'long' })
    };
  });

  const times = ['08:00', '10:00', '12:00', '14:00', '18:00', '20:00'];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Planejamento: {client.name}</h1>
          <p className="text-gray-500">Organize suas postagens por horário e plataforma.</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => onWeekChange(currentWeekOffset - 1)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <ChevronRight className="rotate-180" size={20} />
          </button>
          <span className="px-4 py-2 font-bold text-sm flex items-center min-w-[150px] justify-center">
            {days[0].date} - {days[6].date} {days[0].month}
          </span>
          <button 
            onClick={() => onWeekChange(currentWeekOffset + 1)}
            className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"
          >
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <div className="grid grid-cols-8 border-b border-black/15">
              <div className="p-4 border-r border-black/15 bg-gray-50/50"></div>
              {days.map(day => (
                <div key={day.name} className="p-4 text-center border-r border-black/15 last:border-0">
                  <div className="text-[10px] uppercase tracking-widest text-gray-400 font-bold mb-1">{day.name}</div>
                  <div className="text-lg font-bold leading-none">{day.date}</div>
                </div>
              ))}
            </div>
            {times.map(time => (
              <div key={time} className="grid grid-cols-8 border-b border-black/15 last:border-0">
                <div className="p-4 text-right text-sm font-mono font-bold text-black border-r border-black/15 bg-gray-50/30">
                  {time}
                </div>
                {days.map(day => {
                  const post = client.posts.find(p => p.time === time && p.date === day.name);
                  return (
                    <div 
                      key={`${day.name}-${time}`} 
                      className="p-2 border-r border-black/15 last:border-0 min-h-[80px] hover:bg-gray-50/50 transition-colors cursor-pointer relative group"
                    >
                      <span className="absolute top-1 right-1 text-[8px] font-bold text-gray-400 transition-colors">
                        {day.date}
                      </span>
                      {post && (
                        <div 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setSelectedPostId(post.id === selectedPostId ? null : post.id); 
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation();
                            onEditPost(post);
                          }}
                          className={cn(
                            "absolute inset-1 p-2 text-white rounded-lg text-[10px] font-bold shadow-sm z-1 transition-all",
                            post.color || (post.type === 'HERO' ? "bg-blue-500" : post.type === 'HUB' ? "bg-emerald-500" : "bg-amber-500"),
                            selectedPostId === post.id && "ring-2 ring-black ring-offset-2 scale-[0.98]"
                          )}
                        >
                          {post.platform}: {post.title}
                        </div>
                      )}
                      <button 
                        onClick={() => onAddPost(day.name, time)}
                        className="absolute bottom-1 right-1 p-1 bg-white border border-gray-100 rounded opacity-0 group-hover:opacity-100 transition-opacity z-2"
                      >
                        <Plus size={10} />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </Card>

      <AnimatePresence>
        {selectedPost && (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-8 right-8 bg-white p-4 rounded-2xl shadow-2xl border border-black/5 z-50 flex flex-col gap-3"
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-[10px] uppercase tracking-widest font-bold text-gray-400">Mudar Cor</span>
              <button onClick={() => setSelectedPostId(null)} className="p-1 hover:bg-gray-100 rounded">
                <X size={14} />
              </button>
            </div>
            <div className="flex gap-2">
              {colors.map(color => (
                <button
                  key={color.class}
                  onClick={() => handleColorSelect(color.class)}
                  className={cn(
                    "w-6 h-6 rounded-full transition-transform hover:scale-110",
                    color.class,
                    selectedPost.color === color.class && "ring-2 ring-black ring-offset-2"
                  )}
                  title={color.name}
                />
              ))}
            </div>
            <div className="text-[10px] text-gray-400 font-medium truncate max-w-[150px]">
              Editando: {selectedPost.title}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Login View ---

const LoginView = ({ onLogin, error }: { onLogin: () => void, error: string | null }) => (
  <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4">
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-8"
    >
      <div className="w-20 h-20 bg-black rounded-3xl flex items-center justify-center text-white font-bold text-4xl italic mx-auto shadow-xl">C</div>
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Bem-vindo ao COBO by Mattz</h1>
        <p className="text-gray-500">Sua central de inteligência para conteúdo estratégico.</p>
      </div>
      
      {error && (
        <div className="p-4 bg-red-50 border border-red-100 rounded-2xl text-red-600 text-sm text-left">
          <p className="font-bold mb-1">Erro ao entrar:</p>
          <p className="opacity-90">{error}</p>
          {error.includes('auth/unauthorized-domain') && (
            <p className="mt-2 text-xs font-medium">
              Dica: Adicione o domínio do app no Console do Firebase (Authentication {'>'} Settings {'>'} Authorized domains).
            </p>
          )}
        </div>
      )}
      
      <button 
        onClick={onLogin}
        className="w-full py-4 bg-white border-2 border-gray-100 rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-gray-50 hover:border-gray-200 transition-all group"
      >
        <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
        <span>Entrar com Google</span>
        <ChevronRight size={18} className="text-gray-300 group-hover:text-black transition-colors" />
      </button>
      
      <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold">
        Acesso restrito a usuários autorizados
      </p>
    </motion.div>
  </div>
);

// --- Google Maps API Key Check ---
const GOOGLE_MAPS_API_KEY =
  process.env.GOOGLE_MAPS_PLATFORM_KEY ||
  (import.meta as any).env?.VITE_GOOGLE_MAPS_PLATFORM_KEY ||
  (globalThis as any).GOOGLE_MAPS_PLATFORM_KEY ||
  '';
const hasValidMapsKey = Boolean(GOOGLE_MAPS_API_KEY) && GOOGLE_MAPS_API_KEY !== 'YOUR_API_KEY';

const MapsKeySplashScreen = () => (
  <div className="min-h-screen bg-brand-bg flex items-center justify-center p-4 font-sans">
    <div className="max-w-lg w-full bg-white rounded-3xl shadow-2xl p-10 text-center space-y-6">
      <h2 className="text-2xl font-bold tracking-tight">Chave da API do Google Maps Necessária</h2>
      <p className="text-gray-600">Para utilizar as funcionalidades de mapa, você precisa configurar sua chave de API.</p>
      
      <div className="text-left space-y-4 bg-gray-50 p-6 rounded-2xl border border-gray-100">
        <p className="text-sm font-semibold">Passo 1: Obtenha uma Chave de API</p>
        <p className="text-xs text-gray-500">Acesse o <a href="https://console.cloud.google.com/google/maps-apis/credentials" target="_blank" rel="noopener" className="text-blue-600 underline">Google Cloud Console</a> para criar sua chave.</p>
        
        <p className="text-sm font-semibold">Passo 2: Adicione a chave no AI Studio</p>
        <ul className="text-xs text-gray-500 list-disc list-inside space-y-2">
          <li>Abra as <strong>Settings</strong> (ícone de engrenagem ⚙️, no canto superior direito)</li>
          <li>Selecione <strong>Secrets</strong></li>
          <li>Digite <code>GOOGLE_MAPS_PLATFORM_KEY</code> como o nome do segredo, pressione <strong>Enter</strong></li>
          <li>Cole sua chave de API como o valor, pressione <strong>Enter</strong></li>
        </ul>
      </div>
      
      <p className="text-xs text-gray-400">O aplicativo será reiniciado automaticamente após você adicionar o segredo.</p>
    </div>
  </div>
);

  // --- Main App ---
  
  export default function App() {
    useEffect(() => {
      const updateTitle = () => {
        document.title = "COBO by Mattz";
      };
      updateTitle();
      const interval = setInterval(updateTitle, 1000);
      window.addEventListener('focus', updateTitle);
      return () => {
        clearInterval(interval);
        window.removeEventListener('focus', updateTitle);
      };
    }, []);

  if (!hasValidMapsKey) {
    return <MapsKeySplashScreen />;
  }

  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [loginError, setLoginError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'cobo' | 'modeling' | 'planning'>('dashboard');
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeClientId, setActiveClientId] = useState<string | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [editingPost, setEditingPost] = useState<Post | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<{ date: string; time: string } | null>(null);
  const [isFormatModalOpen, setIsFormatModalOpen] = useState(false);
  const [editingFormat, setEditingFormat] = useState<{ name: string; desc: string; index?: number } | null>(null);
  const [isStrategyModalOpen, setIsStrategyModalOpen] = useState(false);
  const [isModelingModalOpen, setIsModelingModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [currentWeekOffset, setCurrentWeekOffset] = useState(0);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
      
      if (currentUser) {
        // Sync user profile to Firestore
        const userRef = doc(db, 'users', currentUser.uid);
        try {
          await setDoc(userRef, {
            uid: currentUser.uid,
            email: currentUser.email,
            displayName: currentUser.displayName,
            photoURL: currentUser.photoURL,
            lastLogin: new Date().toISOString()
          }, { merge: true });
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, `users/${currentUser.uid}`);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Clients Listener
  useEffect(() => {
    if (!user) {
      setClients([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const clientsRef = collection(db, 'users', user.uid, 'clients');
    const unsubscribe = onSnapshot(clientsRef, (snapshot) => {
      const clientsData = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id
      })) as Client[];
      
      setClients(clientsData);
      setLoading(false);
      
      if (clientsData.length > 0 && !activeClientId) {
        setActiveClientId(clientsData[0].id);
      }
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, `users/${user.uid}/clients`);
    });

    return () => unsubscribe();
  }, [user]);

  const activeClient = clients.find(c => c.id === activeClientId) || clients[0];

  const [modelingForm, setModelingForm] = useState({
    heroQty: 0,
    hubQty: 0,
    helpQty: 0,
    mistoQty: 0,
    totalPostsMonthly: 0,
  });

  useEffect(() => {
    if (isModelingModalOpen && activeClient) {
      const hero = activeClient.modeling?.heroQty || 0;
      const hub = activeClient.modeling?.hubQty || 0;
      const help = activeClient.modeling?.helpQty || 0;
      const misto = activeClient.modeling?.mistoQty || 0;
      setModelingForm({
        heroQty: hero,
        hubQty: hub,
        helpQty: help,
        mistoQty: misto,
        totalPostsMonthly: hero + hub + help + misto,
      });
    }
  }, [isModelingModalOpen, activeClient]);

  const handleAddPost = (date?: string, time?: string) => {
    setEditingPost(null);
    setSelectedSlot(date && time ? { date, time } : null);
    setIsPostModalOpen(true);
  };

  const handleEditPost = (post: Post) => {
    setEditingPost(post);
    setIsPostModalOpen(true);
  };

  const handleSavePost = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !activeClientId) return;

    const formData = new FormData(e.currentTarget);
    const postData: Partial<Post> = {
      title: formData.get('title') as string,
      platform: formData.get('platform') as any,
      format: formData.get('format') as string,
      type: formData.get('type') as any,
      date: formData.get('date') as string,
      time: formData.get('time') as string,
    };

    const client = clients.find(c => c.id === activeClientId);
    if (!client) return;

    let newPosts = [...client.posts];
    if (editingPost) {
      newPosts = newPosts.map(p => p.id === editingPost.id ? { ...p, ...postData } : p);
    } else {
      newPosts.push({
        id: Math.random().toString(36).substr(2, 9),
        ...postData as Post
      });
    }

    const clientRef = doc(db, 'users', user.uid, 'clients', activeClientId);
    try {
      await updateDoc(clientRef, { posts: newPosts });
      setIsPostModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/clients/${activeClientId}`);
    }
  };

  const handleUpdatePost = async (updatedPost: Post) => {
    if (!user || !activeClientId) return;
    const client = clients.find(c => c.id === activeClientId);
    if (!client) return;

    const newPosts = client.posts.map(p => p.id === updatedPost.id ? updatedPost : p);
    const clientRef = doc(db, 'users', user.uid, 'clients', activeClientId);
    try {
      await updateDoc(clientRef, { posts: newPosts });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/clients/${activeClientId}`);
    }
  };

  const handleSaveModeling = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !activeClientId) return;

    const formData = new FormData(e.currentTarget);
    const heroQty = parseInt(formData.get('heroQty') as string) || 0;
    const hubQty = parseInt(formData.get('hubQty') as string) || 0;
    const helpQty = parseInt(formData.get('helpQty') as string) || 0;
    const mistoQty = parseInt(formData.get('mistoQty') as string) || 0;
    const totalPostsMonthly = heroQty + hubQty + helpQty + mistoQty;
    const adherenceQty = parseInt(formData.get('adherenceQty') as string) || 0;
    const depthQty = parseInt(formData.get('depthQty') as string) || 0;
    const postedDays = parseInt(formData.get('postedDays') as string) || 0;
    const currentPlatform = formData.get('currentPlatform') as string || '';
    const observations = formData.get('observations') as string || '';

    const order = Array.from({ length: 10 }, (_, i) => formData.get(`order_${i}`) as string || '');
    const group = Array.from({ length: 10 }, (_, i) => formData.get(`group_${i}`) as string || '');

    const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
    const weeklySchedule: { [key: string]: any } = {};
    days.forEach(day => {
      weeklySchedule[day] = {
        content: formData.get(`schedule_${day}_content`) as string || '',
        format: formData.get(`schedule_${day}_format`) as string || '',
        time: formData.get(`schedule_${day}_time`) as string || '',
        type: formData.get(`schedule_${day}_type`) as string || 'HELP',
      };
    });

    const clientRef = doc(db, 'users', user.uid, 'clients', activeClientId);
    try {
      await updateDoc(clientRef, { 
        modeling: { 
          heroQty, 
          hubQty, 
          helpQty, 
          mistoQty, 
          totalPostsMonthly,
          adherenceQty, 
          depthQty, 
          postedDays,
          currentPlatform,
          observations,
          order,
          group,
          weeklySchedule
        } 
      });
      setIsModelingModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/clients/${activeClientId}`);
    }
  };

  const handleDeletePost = async (postId: string) => {
    if (!user || !activeClientId) return;
    const client = clients.find(c => c.id === activeClientId);
    if (!client) return;

    const newPosts = client.posts.filter(p => p.id !== postId);
    const clientRef = doc(db, 'users', user.uid, 'clients', activeClientId);
    try {
      await updateDoc(clientRef, { posts: newPosts });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/clients/${activeClientId}`);
    }
  };

  const handleSaveFormat = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !activeClientId) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    const desc = formData.get('desc') as string;

    const client = clients.find(c => c.id === activeClientId);
    if (!client) return;

    let newFormats = [...client.strategy.contentFormats];
    if (editingFormat && editingFormat.index !== undefined) {
      newFormats[editingFormat.index] = { name, desc };
    } else {
      newFormats.push({ name, desc });
    }

    const clientRef = doc(db, 'users', user.uid, 'clients', activeClientId);
    try {
      await updateDoc(clientRef, { 
        'strategy.contentFormats': newFormats 
      });
      setIsFormatModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/clients/${activeClientId}`);
    }
  };

  const handleSaveStrategy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !activeClientId) return;

    const formData = new FormData(e.currentTarget);
    const primaryNetwork = formData.get('primaryNetwork') as string;
    const secondaryNetworks = (formData.get('secondaryNetworks') as string).split(',').map(s => s.trim()).filter(Boolean);
    const tertiaryNetworks = (formData.get('tertiaryNetworks') as string).split(',').map(s => s.trim()).filter(Boolean);

    const clientRef = doc(db, 'users', user.uid, 'clients', activeClientId);
    try {
      await updateDoc(clientRef, { 
        'strategy.primaryNetwork': primaryNetwork,
        'strategy.secondaryNetworks': secondaryNetworks,
        'strategy.tertiaryNetworks': tertiaryNetworks
      });
      setIsStrategyModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}/clients/${activeClientId}`);
    }
  };

  const handleAddClient = () => {
    setEditingClient(null);
    setIsClientModalOpen(true);
  };

  const handleEditClient = (client: Client) => {
    setEditingClient(client);
    setIsClientModalOpen(true);
  };

  const handleDeleteClient = async (id: string) => {
    if (!user || clients.length <= 0) return;
    
    const clientRef = doc(db, 'users', user.uid, 'clients', id);
    try {
      await deleteDoc(clientRef);
      if (activeClientId === id) {
        const remaining = clients.filter(c => c.id !== id);
        setActiveClientId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${user.uid}/clients/${id}`);
    }
  };

  const handleSaveClient = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user) return;

    const formData = new FormData(e.currentTarget);
    const name = formData.get('name') as string;
    
    try {
      if (editingClient) {
        const clientRef = doc(db, 'users', user.uid, 'clients', editingClient.id);
        await updateDoc(clientRef, { name });
      } else {
        const clientsRef = collection(db, 'users', user.uid, 'clients');
        const newClientData = {
          name,
          avatar: `https://picsum.photos/seed/${name}/100/100`,
          strategy: {
            id: Math.random().toString(36).substr(2, 9),
            primaryNetwork: 'Instagram',
            secondaryNetworks: [],
            tertiaryNetworks: [],
            contentFormats: []
          },
          posts: [],
          modeling: { 
            heroQty: 0, 
            hubQty: 0, 
            helpQty: 0, 
            mistoQty: 0, 
            adherenceQty: 0, 
            depthQty: 0, 
            postedDays: 0,
            currentPlatform: 'Instagram',
            order: Array(10).fill(''),
            group: Array(10).fill(''),
            weeklySchedule: {}
          }
        };
        const docRef = await addDoc(clientsRef, newClientData);
        setActiveClientId(docRef.id);
      }
      setIsClientModalOpen(false);
    } catch (error) {
      handleFirestoreError(error, editingClient ? OperationType.UPDATE : OperationType.CREATE, `users/${user.uid}/clients`);
    }
  };

  const handleLogin = async () => {
    setLoginError(null);
    try {
      await loginWithGoogle();
    } catch (error: any) {
      setLoginError(error.message || 'Erro desconhecido ao fazer login');
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-brand-bg flex items-center justify-center">
        <Loader2 className="animate-spin text-black" size={40} />
      </div>
    );
  }

  if (!user) {
    return <LoginView onLogin={handleLogin} error={loginError} />;
  }

  return (
    <div className="flex h-screen bg-brand-bg overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-black/5 bg-white flex flex-col p-6">
        <div className="flex items-center gap-3 mb-10 px-2">
          <div className="w-10 h-10 bg-black rounded-xl flex items-center justify-center text-white font-bold text-xl italic">C</div>
          <h2 className="font-bold text-xl tracking-tight">COBO by Mattz</h2>
        </div>

        <nav className="flex-1 space-y-2">
          <SidebarItem 
            icon={LayoutDashboard} 
            label="Dashboard" 
            active={activeView === 'dashboard'} 
            onClick={() => setActiveView('dashboard')} 
          />
          <SidebarItem 
            icon={Sparkles} 
            label="Content Board" 
            active={activeView === 'cobo'} 
            onClick={() => setActiveView('cobo')} 
          />
          <SidebarItem 
            icon={BarChart3} 
            label="Modelagem" 
            active={activeView === 'modeling'} 
            onClick={() => setActiveView('modeling')} 
          />
          <SidebarItem 
            icon={CalendarIcon} 
            label="Planejamento" 
            active={activeView === 'planning'} 
            onClick={() => setActiveView('planning')} 
          />
        </nav>

        <div className="mt-auto space-y-4">
          {loading ? (
            <div className="p-4 flex justify-center">
              <Loader2 className="animate-spin text-gray-300" size={20} />
            </div>
          ) : (
            <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                  <BarChart3 size={16} />
                </div>
                <span className="text-xs font-bold uppercase tracking-wider">Desempenho</span>
              </div>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                {activeClient 
                  ? `Estratégia de ${activeClient.name} está com boa aderência.`
                  : "Nenhum cliente selecionado."}
              </p>
            </div>
          )}
          <SidebarItem icon={Settings} label="Configurações" onClick={() => setIsSettingsModalOpen(true)} />
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        {/* Header */}
        <header className="h-20 border-b border-black/5 bg-white/50 backdrop-blur-md sticky top-0 z-10 px-8 flex items-center justify-between">
          <div className="flex items-center gap-6">
            {/* Client Selector */}
            <div className="relative group">
              <button className="flex items-center gap-3 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-all">
                <Users size={18} className="text-gray-500" />
                <span className="text-sm font-bold">{activeClient?.name || 'Selecionar Cliente'}</span>
                <ChevronRight size={16} className="rotate-90 text-gray-400" />
              </button>
              
              <div className="absolute top-full left-0 mt-2 w-64 bg-white border border-black/5 shadow-xl rounded-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 p-2">
                <div className="max-h-64 overflow-y-auto space-y-1">
                  {clients.map(client => (
                    <div key={client.id} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded-xl transition-colors group/item">
                      <button 
                        onClick={() => setActiveClientId(client.id)}
                        className="flex items-center gap-3 flex-1 text-left"
                      >
                        <div className="w-8 h-8 rounded-lg bg-gray-100 overflow-hidden">
                          <img src={client.avatar} alt={client.name} referrerPolicy="no-referrer" />
                        </div>
                        <span className={cn("text-sm", activeClientId === client.id ? "font-bold" : "font-medium")}>
                          {client.name}
                        </span>
                      </button>
                      <div className="flex gap-1 opacity-0 group-hover/item:opacity-100 transition-opacity">
                        <button onClick={() => handleEditClient(client)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-black">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => handleDeleteClient(client.id)} className="p-1 hover:bg-gray-200 rounded text-gray-400 hover:text-red-500">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="border-t border-gray-100 mt-2 pt-2">
                  <button 
                    onClick={handleAddClient}
                    className="w-full flex items-center gap-2 p-2 hover:bg-gray-50 rounded-xl text-sm font-bold text-blue-600 transition-colors"
                  >
                    <Plus size={16} />
                    Novo Cliente
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
              className="p-2 text-gray-400 hover:text-black hover:bg-gray-100 rounded-xl transition-all relative"
            >
              <Bell size={20} />
              <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            
            {isNotificationsOpen && (
              <div className="absolute top-full right-8 mt-2 w-80 bg-white border border-black/5 shadow-2xl rounded-2xl z-30 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-bold">Notificações</h4>
                  <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">2 NOVAS</span>
                </div>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold mb-1">Novo Post Agendado</p>
                    <p className="text-[10px] text-gray-500">Um novo conteúdo foi adicionado ao seu cronograma.</p>
                  </div>
                  <div className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-xs font-bold mb-1">Estratégia Atualizada</p>
                    <p className="text-[10px] text-gray-500">Sua matriz de modelagem foi ajustada recentemente.</p>
                  </div>
                </div>
              </div>
            )}

            <div className="h-8 w-[1px] bg-gray-200 mx-2"></div>
            <div className="relative">
              <div 
                onClick={() => setIsProfileOpen(!isProfileOpen)}
                className="flex items-center gap-3 cursor-pointer group"
              >
                <div className="text-right">
                  <p className="text-sm font-bold leading-none">{user.displayName || 'Usuário'}</p>
                  <p className="text-[10px] text-gray-400 font-medium">{user.email}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-gray-200 overflow-hidden border-2 border-transparent group-hover:border-black transition-all">
                  <img src={user.photoURL || `https://picsum.photos/seed/${user.uid}/100/100`} alt="Avatar" referrerPolicy="no-referrer" />
                </div>
              </div>

              {isProfileOpen && (
                <div className="absolute top-full right-0 mt-2 w-48 bg-white border border-black/5 shadow-2xl rounded-2xl z-30 p-2">
                  <button className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 rounded-xl text-sm font-medium transition-colors">
                    <UserIcon size={16} />
                    Meu Perfil
                  </button>
                  <button 
                    onClick={() => logout()}
                    className="w-full flex items-center gap-2 p-3 hover:bg-gray-50 rounded-xl text-sm font-medium text-red-500 transition-colors"
                  >
                    <LogOut size={16} />
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* View Content */}
        <div className="p-8 max-w-7xl mx-auto">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-4">
              <Loader2 className="animate-spin text-black" size={40} />
              <p className="text-gray-500 font-medium">Carregando seus dados...</p>
            </div>
          ) : clients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-6 text-center">
              <div className="w-20 h-20 bg-gray-100 rounded-3xl flex items-center justify-center text-gray-300">
                <Users size={40} />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-2">Nenhum cliente encontrado</h2>
                <p className="text-gray-500 max-w-md">Comece adicionando seu primeiro cliente para gerenciar estratégias e conteúdos.</p>
              </div>
              <button 
                onClick={handleAddClient}
                className="bg-black text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-gray-800 transition-all"
              >
                <Plus size={20} />
                Adicionar Primeiro Cliente
              </button>
            </div>
          ) : activeClient ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={`${activeView}-${activeClientId}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {activeView === 'dashboard' && <DashboardView client={activeClient} onAddPost={() => handleAddPost()} onEditPost={handleEditPost} />}
                {activeView === 'cobo' && (
                  <COBOView 
                    client={activeClient} 
                    onEditStrategy={() => setIsStrategyModalOpen(true)}
                    onAddFormat={() => { setEditingFormat(null); setIsFormatModalOpen(true); }}
                    onEditFormat={(format, index) => { setEditingFormat({ ...format, index }); setIsFormatModalOpen(true); }}
                  />
                )}
                {activeView === 'modeling' && <ModelingView client={activeClient} onEditModeling={() => setIsModelingModalOpen(true)} />}
                {activeView === 'planning' && (
                  <PlanningView 
                    client={activeClient} 
                    onAddPost={handleAddPost} 
                    onEditPost={handleEditPost} 
                    onUpdatePost={handleUpdatePost}
                    currentWeekOffset={currentWeekOffset}
                    onWeekChange={setCurrentWeekOffset}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex items-center justify-center py-20">
              <p className="text-gray-500">Selecione um cliente para visualizar os dados.</p>
            </div>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      <AnimatePresence>
        {isSettingsModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSettingsModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Configurações</h3>
                <button onClick={() => setIsSettingsModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="text-sm font-bold mb-3">Preferências da Agência</h4>
                  <div className="space-y-2">
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" />
                      <span className="text-sm">Notificações por E-mail</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl cursor-pointer">
                      <input type="checkbox" defaultChecked className="w-4 h-4 rounded border-gray-300 text-black focus:ring-black" />
                      <span className="text-sm">Relatórios Semanais Automáticos</span>
                    </label>
                  </div>
                </div>
                <button 
                  onClick={() => setIsSettingsModalOpen(false)}
                  className="w-full py-3 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-all"
                >
                  Salvar Alterações
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modeling Modal */}
      <AnimatePresence>
        {isModelingModalOpen && activeClient && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModelingModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl p-8 max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6 sticky top-0 bg-white z-10 pb-4 border-b">
                <div>
                  <h3 className="text-xl font-bold">Editar Modelagem Sistemática</h3>
                  <p className="text-xs text-gray-500">Configure as quantidades e a grade semanal.</p>
                </div>
                <button onClick={() => setIsModelingModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                  <X size={20} />
                </button>
              </div>
              
              <form onSubmit={handleSaveModeling} className="space-y-8">
                {/* Equilíbrio Section */}
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Equilíbrio de Conteúdo (Mensal)</h4>
                    <div className="bg-black text-white px-4 py-1 rounded-full text-[10px] font-bold">
                      TOTAL: {modelingForm.heroQty + modelingForm.hubQty + modelingForm.helpQty + modelingForm.mistoQty} POSTS/MÊS
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { name: 'heroQty', label: 'HERO', color: 'text-blue-500', bg: 'bg-blue-50' },
                      { name: 'hubQty', label: 'HUB', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                      { name: 'helpQty', label: 'HELP', color: 'text-amber-500', bg: 'bg-amber-50' },
                      { name: 'mistoQty', label: 'MISTO', color: 'text-rose-500', bg: 'bg-rose-50' },
                    ].map(field => {
                      const total = modelingForm.heroQty + modelingForm.hubQty + modelingForm.helpQty + modelingForm.mistoQty;
                      const pct = total > 0 ? Math.round((modelingForm[field.name as keyof typeof modelingForm] / total) * 100) : 0;
                      const perWeek = (modelingForm[field.name as keyof typeof modelingForm] / 4).toFixed(1);
                      
                      return (
                        <div key={field.name} className={cn("p-4 rounded-2xl border border-transparent transition-all", field.bg)}>
                          <label className="text-[10px] font-bold text-gray-500 uppercase mb-2 block">{field.label}</label>
                          <input 
                            name={field.name} 
                            type="number" 
                            value={modelingForm[field.name as keyof typeof modelingForm]} 
                            onChange={(e) => setModelingForm(prev => ({ ...prev, [field.name]: parseInt(e.target.value) || 0 }))}
                            className="w-full bg-white/50 border border-gray-200 rounded-xl p-2 text-sm font-bold outline-none focus:ring-2 focus:ring-black/5" 
                          />
                          <div className="mt-3 space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">Percentual:</span>
                              <span className={cn("text-[10px] font-bold", field.color)}>{pct}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-gray-400">Média/Semana:</span>
                              <span className="text-[10px] font-bold text-gray-600">{perWeek}</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Permeabilidade & Info Section */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Aderência (Qtd)</label>
                    <input name="adherenceQty" type="number" defaultValue={activeClient.modeling?.adherenceQty || 0} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Profundidade (Qtd)</label>
                    <input name="depthQty" type="number" defaultValue={activeClient.modeling?.depthQty || 0} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Dias Postados</label>
                    <input name="postedDays" type="number" defaultValue={activeClient.modeling?.postedDays || 0} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5" />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Plataforma Vigente</label>
                  <input name="currentPlatform" type="text" defaultValue={activeClient.modeling?.currentPlatform || ''} placeholder="Ex: Instagram" className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5" />
                </div>

                <div>
                  <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Observações da Modelagem</label>
                  <textarea name="observations" defaultValue={activeClient.modeling?.observations || ''} rows={3} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:ring-2 focus:ring-black/5 resize-none" />
                </div>

                {/* Weekly Schedule Section */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Grade Semanal</h4>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="p-2 border border-gray-200 text-left text-[10px] font-bold text-gray-400 uppercase">Dia</th>
                          <th className="p-2 border border-gray-200 text-left text-[10px] font-bold text-gray-400 uppercase">Tipo</th>
                          <th className="p-2 border border-gray-200 text-left text-[10px] font-bold text-gray-400 uppercase">Conteúdo</th>
                          <th className="p-2 border border-gray-200 text-left text-[10px] font-bold text-gray-400 uppercase">Formato</th>
                          <th className="p-2 border border-gray-200 text-left text-[10px] font-bold text-gray-400 uppercase">Horário</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(day => (
                          <tr key={day}>
                            <td className="p-2 border border-gray-200 font-bold bg-gray-50/50">{day}</td>
                            <td className="p-2 border border-gray-200">
                              <select 
                                name={`schedule_${day}_type`} 
                                defaultValue={activeClient.modeling?.weeklySchedule?.[day]?.type || 'HELP'}
                                className="w-full p-1 bg-transparent outline-none text-[10px] font-bold"
                              >
                                <option value="HERO">HERO</option>
                                <option value="HUB">HUB</option>
                                <option value="HELP">HELP</option>
                                <option value="MISTO">MISTO</option>
                              </select>
                            </td>
                            <td className="p-2 border border-gray-200">
                              <input name={`schedule_${day}_content`} type="text" defaultValue={activeClient.modeling?.weeklySchedule?.[day]?.content || ''} className="w-full p-1 bg-transparent outline-none text-xs" />
                            </td>
                            <td className="p-2 border border-gray-200">
                              <input name={`schedule_${day}_format`} type="text" defaultValue={activeClient.modeling?.weeklySchedule?.[day]?.format || ''} className="w-full p-1 bg-transparent outline-none text-xs" />
                            </td>
                            <td className="p-2 border border-gray-200">
                              <input name={`schedule_${day}_time`} type="text" defaultValue={activeClient.modeling?.weeklySchedule?.[day]?.time || ''} className="w-full p-1 bg-transparent outline-none text-xs" />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-100 font-bold">
                          <td className="p-2 border border-gray-200">TOTAL</td>
                          <td className="p-2 border border-gray-200" colSpan={3}>
                            {['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].filter(day => activeClient.modeling?.weeklySchedule?.[day]?.content).length} Posts Planejados
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>

                {/* Ordem & Grupo Section */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Ordem de Conteúdo</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 w-6">{i + 1}º</span>
                          <input name={`order_${i}`} type="text" defaultValue={activeClient.modeling?.order?.[i] || ''} className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-black/5" />
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-4">
                    <h4 className="text-sm font-bold uppercase tracking-wider text-gray-400">Grupo de Conteúdo</h4>
                    <div className="grid grid-cols-1 gap-2">
                      {Array.from({ length: 10 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-gray-400 w-6">{i + 1}º</span>
                          <input name={`group_${i}`} type="text" defaultValue={activeClient.modeling?.group?.[i] || ''} className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-lg text-xs outline-none focus:ring-2 focus:ring-black/5" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-6 border-t sticky bottom-0 bg-white pb-2">
                  <button 
                    type="submit"
                    className="w-full py-4 bg-black text-white font-bold text-sm rounded-2xl hover:bg-gray-800 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Check size={20} />
                    Salvar Modelagem Completa
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Post Modal */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsPostModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{editingPost ? 'Editar Post' : 'Novo Post'}</h3>
                <button onClick={() => setIsPostModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSavePost} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Título do Conteúdo</label>
                  <input 
                    name="title"
                    type="text" 
                    defaultValue={editingPost?.title || ''}
                    placeholder="Ex: Dica de Design"
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Plataforma</label>
                    <select name="platform" defaultValue={editingPost?.platform || 'Instagram'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                      <option>Instagram</option>
                      <option>TikTok</option>
                      <option>YouTube</option>
                      <option>Facebook</option>
                      <option>Stories</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Tipo (Modeling)</label>
                    <select name="type" defaultValue={editingPost?.type || 'HELP'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                      <option>HERO</option>
                      <option>HUB</option>
                      <option>HELP</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Dia</label>
                    <select name="date" defaultValue={editingPost?.date || selectedSlot?.date || 'Segunda'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                      <option>Segunda</option>
                      <option>Terça</option>
                      <option>Quarta</option>
                      <option>Quinta</option>
                      <option>Sexta</option>
                      <option>Sábado</option>
                      <option>Domingo</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Horário</label>
                    <select name="time" defaultValue={editingPost?.time || selectedSlot?.time || '08:00'} className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none">
                      <option>08:00</option>
                      <option>10:00</option>
                      <option>12:00</option>
                      <option>14:00</option>
                      <option>18:00</option>
                      <option>20:00</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Formato</label>
                  <input 
                    name="format"
                    type="text" 
                    defaultValue={editingPost?.format || ''}
                    placeholder="Ex: Reels, Carrossel..."
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  {editingPost && (
                    <button 
                      type="button"
                      onClick={() => { handleDeletePost(editingPost.id); setIsPostModalOpen(false); }}
                      className="px-4 py-3 font-bold text-sm text-red-500 hover:bg-red-50 rounded-xl transition-all"
                    >
                      Excluir
                    </button>
                  )}
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Salvar Post
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Format Modal */}
      <AnimatePresence>
        {isFormatModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsFormatModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{editingFormat ? 'Editar Formato' : 'Novo Formato'}</h3>
                <button onClick={() => setIsFormatModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveFormat} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome do Formato</label>
                  <input 
                    name="name"
                    type="text" 
                    defaultValue={editingFormat?.name || ''}
                    placeholder="Ex: Time Coat"
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Descrição</label>
                  <textarea 
                    name="desc"
                    defaultValue={editingFormat?.desc || ''}
                    placeholder="Descreva como funciona esse formato..."
                    required
                    rows={3}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all resize-none"
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-3 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Salvar Formato
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Strategy Modal */}
      <AnimatePresence>
        {isStrategyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsStrategyModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">Editar Estratégia de Redes</h3>
                <button onClick={() => setIsStrategyModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveStrategy} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Rede Primária</label>
                  <input 
                    name="primaryNetwork"
                    type="text" 
                    defaultValue={activeClient.strategy.primaryNetwork}
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Redes Secundárias (separadas por vírgula)</label>
                  <input 
                    name="secondaryNetworks"
                    type="text" 
                    defaultValue={activeClient.strategy.secondaryNetworks.join(', ')}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Redes Terciárias (separadas por vírgula)</label>
                  <input 
                    name="tertiaryNetworks"
                    type="text" 
                    defaultValue={activeClient.strategy.tertiaryNetworks.join(', ')}
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>
                <div className="pt-4">
                  <button 
                    type="submit"
                    className="w-full py-3 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Salvar Estratégia
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Client Modal */}
      <AnimatePresence>
        {isClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsClientModalOpen(false)}
              className="absolute inset-0 bg-black/20 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-8"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold">{editingClient ? 'Editar Cliente' : 'Novo Cliente'}</h3>
                <button onClick={() => setIsClientModalOpen(false)} className="p-2 hover:bg-gray-100 rounded-xl text-gray-400">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSaveClient} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">Nome do Cliente / Empresa</label>
                  <input 
                    name="name"
                    type="text" 
                    defaultValue={editingClient?.name || ''}
                    placeholder="Ex: William Silva"
                    required
                    className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-black/5 transition-all"
                  />
                </div>
                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsClientModalOpen(false)}
                    className="flex-1 py-3 font-bold text-sm text-gray-500 hover:bg-gray-100 rounded-xl transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    className="flex-1 py-3 bg-black text-white font-bold text-sm rounded-xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                  >
                    <Check size={18} />
                    Salvar Cliente
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
