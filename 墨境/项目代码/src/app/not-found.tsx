import Link from 'next/link'
import Image from 'next/image'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center max-w-md px-6">
        <Image src="/assets/brand/mojing-fall.png" alt="小墨团" width={180} height={180} className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">页面不存在</h1>
        <p className="text-muted-foreground mb-8 text-sm">
          抱歉，你访问的页面不存在或已被移除。
        </p>
        <Link
          href="/desk"
          className="px-5 py-2 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary-hover transition-colors"
        >
          返回书桌
        </Link>
      </div>
    </div>
  )
}
