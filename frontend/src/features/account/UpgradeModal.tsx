"use client";
export default function UpgradeModal({
  open,
  onClose,
  used,
  limit,
  reason,
}: {
  open: boolean;
  onClose: () => void;
  used?: number;
  limit?: number;
  reason?: string;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-3xl overflow-hidden shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-gradient-to-br from-[#a28ff3] to-[#7c64ff] text-white p-6">
          <div className="flex items-center gap-2">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 16.8 5.8 21.3l2.4-7.4L2 9.4h7.6L12 2z" />
            </svg>
            <span className="text-sm font-semibold uppercase tracking-wide">Upgrade to Pro</span>
          </div>
          <h2 className="mt-2 text-2xl font-semibold">Generate unlimited videos</h2>
          {typeof limit === "number" && (
            <p className="mt-1 text-white/80 text-sm">
              You've used {used ?? 0} of {limit} free generations.
            </p>
          )}
        </div>
        <div className="p-6 grid gap-3 text-sm text-gray-700">
          {reason && <div className="text-red-600">{reason}</div>}
          <p>
            The free tier includes a small number of generations to keep the demo affordable.
            Pro is available on request — drop me a note and I'll flip your account.
          </p>
          <ul className="list-disc list-inside text-gray-600">
            <li>Unlimited renders</li>
            <li>4K encoding profiles</li>
            <li>Priority queue (when busy)</li>
          </ul>
          <a
            href="mailto:sandhukaran2821@gmail.com?subject=Noteflix%20Pro%20access"
            className="mt-2 px-4 py-2.5 rounded-xl bg-[#a28ff3] text-white font-medium text-center hover:opacity-90"
          >
            Email for Pro access
          </a>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700"
          >
            Maybe later
          </button>
        </div>
      </div>
    </div>
  );
}
