export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="mb-4 text-5xl font-bold tracking-tight">
          Chess<span className="text-green-500">Forge</span>
        </h1>
        <p className="mb-8 max-w-md text-lg text-neutral-400">
          Every mistake you make becomes tomorrow&apos;s lesson. Transform your chess errors into
          personalized training.
        </p>
        <div className="flex gap-4 justify-center">
          <button
            type="button"
            className="rounded-lg bg-green-600 px-6 py-3 font-medium text-white transition-colors hover:bg-green-700"
          >
            Get Started
          </button>
          <button
            type="button"
            className="rounded-lg border border-neutral-700 px-6 py-3 font-medium text-neutral-300 transition-colors hover:bg-neutral-900"
          >
            Learn More
          </button>
        </div>
      </div>
    </main>
  );
}
