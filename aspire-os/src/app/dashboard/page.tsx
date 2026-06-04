'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { type CadenceOutput } from '@/lib/cadence-schema';
import ConnectionBadge from '@/components/ConnectionBadge';
import IntegrationCard from '@/components/IntegrationCard';
import CadenceWidget, {
  type HealthStatus,
  type FitStatus,
  type CalStatus,
  type NotionStatus,
  type HealthData,
  type FitData,
  type CalendarEvent,
} from '@/components/CadenceWidget';
import FourFChat from '@/components/FourFChat';

const reveal = {
  hidden: { opacity: 0, y: 12 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
};

// ── Main component ─────────────────────────────────────────────────────────

export default function DashboardPage() {

  // ── Integration state ────────────────────────────────────────────────

  const [healthStatus, setHealthStatus]   = useState<HealthStatus>('loading');
  const [healthData,   setHealthData]     = useState<HealthData | null>(null);
  const [healthError,  setHealthError]    = useState('');

  const [fitStatus, setFitStatus]         = useState<FitStatus>('loading');
  const [fitData,   setFitData]           = useState<FitData | null>(null);

  const [calStatus,    setCalStatus]      = useState<CalStatus>('loading');
  const [calEvents,    setCalEvents]      = useState<CalendarEvent[]>([]);
  const [calError,     setCalError]       = useState('');

  const [notionStatus,    setNotionStatus]    = useState<NotionStatus>('loading');
  const [notionWorkspace, setNotionWorkspace] = useState('');
  const [notionError,     setNotionError]     = useState('');

  // ── 4F chat state ────────────────────────────────────────────────────

  const [cadenceReady, setCadenceReady]       = useState(false);
  const [currentCadence, setCurrentCadence]   = useState<CadenceOutput | null>(null);

  // ── Boot: parse query params + fetch all integrations ────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (
      params.has('connected') ||
      params.has('calendar_connected') ||
      params.has('health_connected') ||
      params.has('notion_connected') ||
      params.get('error')
    ) {
      window.history.replaceState({}, '', '/dashboard');
    }

    if (params.get('error') === 'notion_auth_failed') {
      setNotionError('Notion authorisation failed — please try again.');
      setNotionStatus('disconnected');
    }
    if (params.get('error') === 'health_auth_failed') {
      setHealthError('Google Health authorisation failed — please try again.');
      setHealthStatus('disconnected');
    }
    if (params.get('error') === 'auth_failed') {
      setFitStatus('disconnected');
    }
    if (params.get('error') === 'calendar_auth_failed') {
      setCalError('Google Calendar authorisation failed — please try again.');
      setCalStatus('disconnected');
    }

    fetchHealth();
    fetchFit();
    fetchCalendar();
    fetchNotion();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Data fetchers ────────────────────────────────────────────────────

  async function fetchHealth() {
    setHealthStatus('loading');
    try {
      const res  = await fetch('/api/auth/google-health/data');
      const json = await res.json();
      if (!json.connected) {
        setHealthStatus(json.reconnectNeeded ? 'reconnect-needed' : 'disconnected');
        return;
      }
      setHealthStatus('connected');
      setHealthData({
        steps:         json.steps         ?? null,
        restingHr:     json.restingHr     ?? null,
        hrv:           json.hrv           ?? null,
        sleepHours:    json.sleepHours    ?? null,
        sourceDevices: json.sourceDevices ?? [],
      });
    } catch {
      setHealthStatus('disconnected');
    }
  }

  async function fetchFit() {
    setFitStatus('loading');
    try {
      const res  = await fetch('/api/auth/google-fit/data');
      const json = await res.json();
      if (!json.connected) {
        setFitStatus(json.reconnectNeeded ? 'reconnect-needed' : 'disconnected');
        return;
      }
      setFitStatus('connected');
      setFitData({
        sleepHours: json.sleepHours ?? null,
        restingHr:  json.restingHr  ?? null,
        steps:      json.steps      ?? null,
      });
    } catch {
      setFitStatus('disconnected');
    }
  }

  async function fetchCalendar() {
    setCalStatus('loading');
    try {
      const res  = await fetch('/api/auth/google-calendar/data');
      const json = await res.json();
      if (!json.connected) {
        setCalStatus(json.reconnectNeeded ? 'reconnect-needed' : 'disconnected');
        return;
      }
      setCalStatus('connected');
      setCalEvents(json.events ?? []);
    } catch {
      setCalStatus('disconnected');
    }
  }

  async function fetchNotion() {
    setNotionStatus('loading');
    try {
      const res  = await fetch('/api/auth/notion/data');
      const json = await res.json();
      if (!json.connected) { setNotionStatus('disconnected'); return; }
      setNotionStatus('connected');
      setNotionWorkspace(json.workspace_name ?? '');
    } catch {
      setNotionStatus('disconnected');
    }
  }

  // ── Disconnect handlers ──────────────────────────────────────────────

  async function handleHealthDisconnect() {
    await fetch('/api/auth/google-health/disconnect', { method: 'POST' });
    setHealthStatus('disconnected');
    setHealthData(null);
    fetchFit(); // re-fetch Fit so it can re-fill form fields
  }

  async function handleFitDisconnect() {
    await fetch('/api/auth/google-fit/disconnect', { method: 'POST' });
    setFitStatus('disconnected');
    setFitData(null);
  }

  async function handleCalDisconnect() {
    await fetch('/api/auth/google-calendar/disconnect', { method: 'POST' });
    setCalStatus('disconnected');
    setCalEvents([]);
  }

  async function handleNotionDisconnect() {
    await fetch('/api/auth/notion/disconnect', { method: 'POST' });
    setNotionStatus('disconnected');
    setNotionWorkspace('');
  }

  // ── Derived ──────────────────────────────────────────────────────────

  const healthSummary = (() => {
    if (!healthData) return undefined;
    const parts: string[] = [];
    const sources = healthData.sourceDevices.join(' + ');
    if (sources) parts.push(sources);
    if (healthData.steps != null) parts.push(`${healthData.steps.toLocaleString()} steps`);
    return parts.join(' · ') || undefined;
  })();

  const fitSummary = (() => {
    if (!fitData) return undefined;
    return fitData.steps != null
      ? `${fitData.steps.toLocaleString()} steps today`
      : undefined;
  })();

  const calSummary = calStatus === 'connected'
    ? `${calEvents.length} event${calEvents.length !== 1 ? 's' : ''} today`
    : undefined;

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <motion.main
      className="min-h-screen bg-midnight"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="max-w-[680px] mx-auto px-4 sm:px-6">

        {/* ── Section A: Header ────────────────────────────────────────── */}
        <motion.header
          className="py-12 sm:py-16"
          variants={reveal}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.05 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-sans font-medium text-2xl text-silver-bright leading-none">ASPIRE OS</p>
              <p className="font-sans text-sm text-silver-muted mt-2">Dashboard</p>
            </div>
            <div className="flex items-center gap-4 pt-1 flex-wrap justify-end">
              <ConnectionBadge
                label="Google Health"
                connected={healthStatus === 'connected'}
                loading={healthStatus === 'loading'}
              />
              <ConnectionBadge
                label="Calendar"
                connected={calStatus === 'connected'}
                loading={calStatus === 'loading'}
              />
              <ConnectionBadge
                label="Notion"
                connected={notionStatus === 'connected'}
                loading={notionStatus === 'loading'}
              />
            </div>
          </div>
        </motion.header>

        {/* ── Section B: Integrations ───────────────────────────────────── */}
        <motion.section
          className="border-t border-midnight-edge py-8 sm:py-12"
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-cobalt mb-6">
            INTEGRATIONS
          </p>

          <div className="space-y-3">
            {/* Google Health */}
            <IntegrationCard
              name="Google Health"
              description="Connects Fitbit, Wear OS, Pixel Watch, and Health Connect — auto-fills HRV, sleep, and heart rate."
              status={healthStatus}
              connectHref="/api/auth/google-health"
              connectLabel="Connect"
              reconnectHref="/api/auth/google-health"
              connectedSummary={healthSummary}
              onDisconnect={handleHealthDisconnect}
              errorMessage={healthError || undefined}
            />

            {/* Google Fit — legacy only, no connect button */}
            {fitStatus === 'connected' && (
              <div className="flex items-center justify-between bg-cobalt/10 border border-cobalt/20 rounded-2xl px-4 py-3">
                <div className="flex items-center gap-2 text-sm">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <circle cx="7" cy="7" r="6" stroke="#2C6BE0" strokeWidth="1.5" />
                    <path d="M4.5 7l2 2 3-3" stroke="#2C6BE0" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span className="text-silver-bright font-medium">Google Fit</span>
                  <span className="text-xs text-silver-muted">(legacy)</span>
                  {fitSummary && <span className="text-silver-muted">· {fitSummary}</span>}
                </div>
                <button
                  type="button"
                  onClick={handleFitDisconnect}
                  className="text-xs text-silver-muted hover:text-silver transition-colors"
                >
                  Disconnect
                </button>
              </div>
            )}

            {/* Google Calendar */}
            <IntegrationCard
              name="Google Calendar"
              description="Auto-fills today's meetings so Cadence can schedule around them."
              status={calStatus}
              connectHref="/api/auth/google-calendar"
              connectLabel="Connect"
              reconnectHref="/api/auth/google-calendar"
              connectedSummary={calSummary}
              onDisconnect={handleCalDisconnect}
              errorMessage={calError || undefined}
            />

            {/* Notion */}
            <IntegrationCard
              name="Notion"
              description="Push your daily protocol to a Notion database — one click from the protocol output."
              status={notionStatus}
              connectHref="/api/auth/notion"
              connectLabel="Connect"
              connectedSummary={notionWorkspace || undefined}
              onDisconnect={handleNotionDisconnect}
              errorMessage={notionError || undefined}
            />
          </div>
        </motion.section>

        {/* ── Section C: Daily Protocol ─────────────────────────────────── */}
        <motion.section
          className="border-t border-midnight-edge py-8 sm:py-12"
          variants={reveal}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-50px' }}
        >
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-cobalt mb-6">
            DAILY PROTOCOL
          </p>

          <CadenceWidget
            healthStatus={healthStatus}
            healthData={healthData}
            fitStatus={fitStatus}
            fitData={fitData}
            calStatus={calStatus}
            calEvents={calEvents}
            notionStatus={notionStatus}
            notionWorkspace={notionWorkspace}
            onNotionDisconnect={handleNotionDisconnect}
            onCadenceGenerated={(cadence) => {
              setCurrentCadence(cadence);
              setCadenceReady(true);
            }}
          />
        </motion.section>

        {/* ── Section D: 4F Chat ────────────────────────────────────────── */}
        <AnimatePresence>
          {cadenceReady && currentCadence && (
            <motion.section
              className="border-t border-midnight-edge py-8 sm:py-12"
              variants={reveal}
              initial="hidden"
              animate="visible"
              exit={{ opacity: 0, y: -8, transition: { duration: 0.2 } }}
            >
              <FourFChat cadenceContext={currentCadence} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="border-t border-midnight-edge py-8 text-center">
          <a href="/privacy" className="font-sans text-xs text-silver-dim hover:text-silver-muted transition-colors">
            Privacy Policy
          </a>
        </footer>

      </div>
    </motion.main>
  );
}
