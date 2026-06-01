import { cn } from "@/lib/utils";

type BrainLoaderProps = {
  className?: string;
};

export function BrainLoader({ className }: BrainLoaderProps) {
  return (
    <div
      className={cn(
        "serene-brain-loader relative grid size-14 place-items-center rounded-full border border-[var(--serene-border-soft)]",
        className,
      )}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="serene-brain-loader-svg h-[68%] w-[68%]"
      >
        <path
          d="M12 5a3 3 0 0 0-5.98.36 3.8 3.8 0 0 0-2.22 5.42 3.75 3.75 0 0 0 .52 6.18A3.8 3.8 0 0 0 12 18Z"
          strokeWidth="1.55"
          vectorEffect="non-scaling-stroke"
          className="serene-brain-path motion-reduce:animate-none"
        />
        <path
          d="M12 5a3 3 0 0 1 5.98.36 3.8 3.8 0 0 1 2.22 5.42 3.75 3.75 0 0 1-.52 6.18A3.8 3.8 0 0 1 12 18Z"
          strokeWidth="1.55"
          vectorEffect="non-scaling-stroke"
          className="serene-brain-path serene-brain-path-delay motion-reduce:animate-none"
        />
        <path
          d="M12 6.2v11.6"
          strokeWidth="1.2"
          vectorEffect="non-scaling-stroke"
          className="serene-brain-stem motion-reduce:animate-none"
        />
      </svg>
    </div>
  );
}
