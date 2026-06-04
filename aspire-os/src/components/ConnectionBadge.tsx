type Props = {
  label: string;
  connected: boolean;
  loading?: boolean;
};

export default function ConnectionBadge({ label, connected, loading }: Props) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-2 h-2 rounded-full flex-shrink-0 transition-colors ${
          loading
            ? 'bg-midnight-edge animate-pulse'
            : connected
            ? 'bg-cobalt'
            : 'bg-midnight-edge'
        }`}
      />
      <span className="text-xs text-silver-muted whitespace-nowrap">{label}</span>
    </div>
  );
}
