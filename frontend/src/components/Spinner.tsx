export default function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const dimensions = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-5 w-5';
  return (
    <span
      className={`${dimensions} inline-block animate-spin rounded-full border-2 border-veridian-emerald/30 border-t-veridian-emerald`}
    />
  );
}
