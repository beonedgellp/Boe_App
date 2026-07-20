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
} from '@beonedge/shared/components/Badges';
import { SectorMiniBar } from '@beonedge/shared/components/SectorMiniBar';

import logo from '@beonedge/shared/assets/logo.svg';
import {
  COMPONENT_LIBRARY,
  loadRemoteAppConfig,
  loadAppConfig,
  publishAppConfig,
  resetAppConfig,
} from '@beonedge/shared/appConfig';
import { useAdminSession } from '@beonedge/client/store/AdminSessionContext';
import { apiRequest, listFromPayload, useHttpApi } from '@beonedge/client/services/_util';
import { listPendingApprovals } from '@beonedge/client/services/authApi';
import '../styles/desktop/admin.css';
import './admin-screens-shared.css';
function StubScreen({ title }: any) {
  return (
    <div className="adm-screen">
      <div className="adm-card adm-stub-card">
        <span className="be-eyebrow">Stub</span>
        <h2 className="adm-card-title">{title}</h2>
        <p className="adm-stub-desc">This screen is a placeholder. Wire up real data when the corresponding service is ready.</p>
      </div>
    </div>
  );
}

export default StubScreen;
