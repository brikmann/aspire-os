'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig, type Variants } from 'framer-motion';
import { type CadenceOutput } from '@/lib/cadence-schema';
import ConnectionBadge from '@/components/ConnectionBadge';
import IntegrationCard from '@/components/IntegrationCard';
import CadenceWidget, {
  type HealthStatus,
  type CalStatus,
  type HealthData,
  type CalendarEvent,
} from '@/components/CadenceWidget';
import FourFChat from '@/components/FourFChat';

// Page-level stagger — parent fires children 0.12s apart
const page: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12, delayChildren: 0.06 } },
};

// Each section enters with a spring: snappy without bounce
const section: Variants = {
  hidden: { opacity: 0, y: 28 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 26, mass: 0.9 },
  },
};

// The conditionally-rendered 4F section needs its own exit
const chatSection: Variants = {
  hidden: { opacity: 0, y: 24 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 280, damping: 26, mass: 0.9 },
  },
  exit: { opacity: 0, y: -10, transition: { duration: 0.2 } },
};

// ── Main component ─────────────────────────────────────────────────────────

export default function DashboardPage() {

  // ── Integration state ────────────────────────────────────────────────

  const [healthStatus, setHealthStatus]   = useState<HealthStatus>('loading');
  const [healthData,   setHealthData]     = useState<HealthData | null>(null);
  const [healthError,  setHealthError]    = useState('');

  const [calStatus,      setCalStatus]      = useState<CalStatus>('loading');
  const [calEvents,      setCalEvents]      = useState<CalendarEvent[]>([]);
  const [calError,       setCalError]       = useState('');

  const [outlookStatus,  setOutlookStatus]  = useState<CalStatus>('loading');
  const [outlookEvents,  setOutlookEvents]  = useState<CalendarEvent[]>([]);
  const [outlookError,   setOutlookError]   = useState('');

  // ── 4F chat state ────────────────────────────────────────────────────

  const [cadenceReady, setCadenceReady]       = useState(false);
  const [currentCadence, setCurrentCadence]   = useState<CadenceOutput | null>(null);

  // ── Boot: parse query params + fetch all integrations ────────────────

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('error') === 'health_auth_failed') {
      setHealthError('Google Health authorisation failed — please try again.');
      setHealthStatus('disconnected');
    }
    if (params.get('error') === 'calendar_auth_failed') {
      setCalError('Google Calendar authorisation failed — please try again.');
      setCalStatus('disconnected');
    }
    if (params.get('error') === 'outlook_auth_failed') {
      setOutlookError('Outlook authorisation failed — please try again.');
      setOutlookStatus('disconnected');
    }

    if (params.toString()) window.history.replaceState({}, '', '/dashboard');

    fetchHealth();
    fetchCalendar();
    fetchOutlook();
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

  async function fetchOutlook() {
    setOutlookStatus('loading');
    try {
      const res  = await fetch('/api/auth/outlook/data');
      const json = await res.json();
      if (!json.connected) {
        setOutlookStatus(json.reconnectNeeded ? 'reconnect-needed' : 'disconnected');
        return;
      }
      setOutlookStatus('connected');
      setOutlookEvents(json.events ?? []);
    } catch {
      setOutlookStatus('disconnected');
    }
  }

  // ── Disconnect handlers ──────────────────────────────────────────────

  async function handleHealthDisconnect() {
    await fetch('/api/auth/google-health/disconnect', { method: 'POST' });
    setHealthStatus('disconnected');
    setHealthData(null);
  }

  async function handleCalDisconnect() {
    await fetch('/api/auth/google-calendar/disconnect', { method: 'POST' });
    setCalStatus('disconnected');
    setCalEvents([]);
  }

  async function handleOutlookDisconnect() {
    await fetch('/api/auth/outlook/disconnect', { method: 'POST' });
    setOutlookStatus('disconnected');
    setOutlookEvents([]);
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

  const calSummary = calStatus === 'connected'
    ? `${calEvents.length} event${calEvents.length !== 1 ? 's' : ''} today`
    : undefined;

  const outlookSummary = outlookStatus === 'connected'
    ? `${outlookEvents.length} event${outlookEvents.length !== 1 ? 's' : ''} today`
    : undefined;

  // Merged calendar data for CadenceWidget
  const effectiveCalStatus: CalStatus =
    calStatus === 'connected' || outlookStatus === 'connected' ? 'connected' :
    calStatus === 'loading'   || outlookStatus === 'loading'   ? 'loading' :
    calStatus === 'reconnect-needed' || outlookStatus === 'reconnect-needed' ? 'reconnect-needed' :
    'disconnected';

  const mergedCalEvents = [...calEvents, ...outlookEvents];

  const calSourceLabel = [
    calStatus === 'connected' ? 'Google Calendar' : null,
    outlookStatus === 'connected' ? 'Outlook' : null,
  ].filter(Boolean).join(' + ');

  const allLoaded = healthStatus !== 'loading' && calStatus !== 'loading' && outlookStatus !== 'loading';
  const autoTrigger = allLoaded && healthStatus === 'connected' && (calStatus === 'connected' || outlookStatus === 'connected');

  // ── Render ────────────────────────────────────────────────────────────

  return (
    <MotionConfig reducedMotion="user">
    {/* motion.main is the stagger container — children enter in cascade */}
    <motion.main
      className="min-h-screen bg-midnight"
      variants={page}
      initial="hidden"
      animate="visible"
    >
      <div className="max-w-[680px] mx-auto px-4 sm:px-6">

        {/* ── Section A: Header ────────────────────────────────────────── */}
        <motion.header className="py-12 sm:py-16" variants={section}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] font-medium uppercase tracking-[4px] text-silver-dim leading-none">Aspire OS</p>
              <p className="font-sans font-semibold text-2xl text-silver-bright tracking-tight leading-tight mt-2">Dashboard</p>
            </div>
            <div className="flex items-center gap-3 pt-1 flex-wrap justify-end">
              <ConnectionBadge
                label="Health"
                connected={healthStatus === 'connected'}
                loading={healthStatus === 'loading'}
              />
              <ConnectionBadge
                label="Calendar"
                connected={calStatus === 'connected'}
                loading={calStatus === 'loading'}
              />
            </div>
          </div>
        </motion.header>

        {/* ── Section B: Integrations ───────────────────────────────────── */}
        <motion.section className="divider-gradient py-8 sm:py-12" variants={section}>
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-cobalt mb-6">
            INTEGRATIONS
          </p>

          {/* Cards stagger within the section */}
          <motion.div
            className="space-y-3"
            variants={{ visible: { transition: { staggerChildren: 0.09 } } }}
          >
            <motion.div variants={section}>
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
            </motion.div>

            <motion.div variants={section}>
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
            </motion.div>

            <motion.div variants={section}>
              <IntegrationCard
                name="Outlook Calendar"
                description="Pulls Microsoft 365 or Outlook.com meetings into Cadence alongside Google Calendar."
                status={outlookStatus}
                connectHref="/api/auth/outlook"
                connectLabel="Connect"
                reconnectHref="/api/auth/outlook"
                connectedSummary={outlookSummary}
                onDisconnect={handleOutlookDisconnect}
                errorMessage={outlookError || undefined}
              />
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ── Section C: Daily Protocol ─────────────────────────────────── */}
        <motion.section className="divider-gradient py-8 sm:py-12" variants={section}>
          <p className="text-xs font-medium uppercase tracking-[1.5px] text-cobalt mb-6">
            DAILY PROTOCOL
          </p>

          <CadenceWidget
            healthStatus={healthStatus}
            healthData={healthData}
            calStatus={effectiveCalStatus}
            calEvents={mergedCalEvents}
            calSourceLabel={calSourceLabel}
            onCadenceGenerated={(cadence) => {
              setCurrentCadence(cadence);
              setCadenceReady(true);
            }}
            autoTrigger={autoTrigger}
          />
        </motion.section>

        {/* ── Section D: 4F Chat ────────────────────────────────────────── */}
        <AnimatePresence>
          {cadenceReady && currentCadence && (
            <motion.section
              className="divider-gradient py-8 sm:py-12"
              variants={chatSection}
              initial="hidden"
              animate="visible"
              exit="exit"
            >
              <FourFChat cadenceContext={currentCadence} />
            </motion.section>
          )}
        </AnimatePresence>

        {/* ── Footer ───────────────────────────────────────────────────── */}
        <footer className="divider-gradient py-8 text-center">
          <a href="/privacy" className="font-sans text-xs text-silver-dim hover:text-silver-muted transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cobalt rounded">
            Privacy Policy
          </a>
        </footer>

      </div>
    </motion.main>
    </MotionConfig>
  );
}
