export function Lightbox({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4 fade-in"
      onClick={onClose}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 rounded-full bg-neutral-800/80 text-white text-lg flex items-center justify-center"
      >
        ×
      </button>
      <img
        src={src}
        alt=""
        className="max-w-full max-h-full rounded-lg object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  )
}
