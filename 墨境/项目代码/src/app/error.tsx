'use client'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <div className="text-6xl mb-4">⚠️</div>
        <h1 className="text-2xl font-bold mb-2">页面出错了</h1>
        <p className="text-muted-foreground mb-6 text-sm">
          系统遇到了一个意外错误，请稍后重试。
        </p>
        <div className="text-xs text-muted-foreground/60 mb-6 max-h-20 overflow-hidden font-mono bg-muted p-3 rounded-lg text-left">
          {error.message || '未知错误'}
        </div>
        <button
          onClick={reset}
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          重试
        </button>
      </div>
    </div>
  )
}
