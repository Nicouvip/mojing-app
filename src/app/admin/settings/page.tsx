import { SettingsForm } from './form'

export default function SettingsPage() {
  const keyConfigured = !!process.env.DEEPSEEK_API_KEY

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">系统设置</h1>
        <p className="text-sm text-muted-foreground mt-1">管理 API Key、默认模型和写作偏好</p>
      </div>
      <SettingsForm keyConfigured={keyConfigured} />
    </div>
  )
}
