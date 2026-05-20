import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  UserCheck, ShieldCheck, LineChart, Layers, TrendingUp, PieChart,
  CreditCard, Repeat, BookOpen, Inbox, LifeBuoy, History, Settings,
  Search, Bell, Plus, MoreHorizontal, LayoutGrid, Trash2, Save, RotateCcw, LogOut,
  X, CheckCircle2, XCircle, Clock, Timer, TrendingDown, Filter, User, Mail, Phone, Shield, FileText,
  BarChart3, Activity, Eye, EyeOff, AlertTriangle, Pencil, Gauge, Percent, Briefcase, Archive, ChevronRight, ClipboardList, ArrowLeft,
  Copy,
} from 'lucide-react';
import {
  RiskBadge, LifecycleBadge, StatusBadge,
} from '../../shared/components/Badges.jsx';
import { SectorMiniBar } from '../../shared/components/SectorMiniBar.jsx';

import logo from '../../assets/logo.svg';
import {
  COMPONENT_LIBRARY,
  loadRemoteAppConfig,
  loadAppConfig,
  publishAppConfig,
  resetAppConfig,
} from '../../shared/appConfig.js';
import { useAdminSession } from '../../client/store/AdminSessionContext.jsx';
import { apiRequest, listFromPayload, useHttpApi } from '../../client/services/_util.js';
import { listPendingApprovals } from '../../client/services/authApi.js';
import '../styles/admin.css';
function StubScreen({ title }) {
  return (
    <div className="adm-screen">
      <div className="adm-card" style={{padding:48,textAlign:'center'}}>
        <span className="be-eyebrow">Stub</span>
        <h3 className="adm-card-title">{title}</h3>
        <p style={{color:'var(--be-slate)',marginTop:8}}>This screen is a placeholder. Wire up real data when the corresponding service is ready.</p>
      </div>
    </div>
  );
}

export default StubScreen;
