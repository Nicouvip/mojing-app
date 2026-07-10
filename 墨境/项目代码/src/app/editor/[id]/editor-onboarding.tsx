export function EditorOnboarding({
  step,
  onClose,
  onNext,
}: {
  step: number
  onClose: () => void
  onNext: () => void
}) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-[20px] shadow-modal max-w-md mx-4 p-8 text-center" onClick={e => e.stopPropagation()}>
        <div className="flex justify-center gap-2 mb-6">
          {[0, 1, 2].map(i => (
            <div key={i} className={`h-2 rounded-full transition-all duration-300 ${i === step ? 'w-8 bg-[#6B8C6E]' : 'w-2 bg-gray-200'}`} />
          ))}
        </div>
        {step === 0 && (
          <div className="space-y-2">
            <h3 className="text-xl font-bold">欢迎来到墨境！</h3>
            <p className="text-sm text-gray-500 leading-relaxed">左侧是你的章节列表，在这里管理你的作品结构。</p>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-2">
            <h3 className="text-xl font-bold">创作中心</h3>
            <p className="text-sm text-gray-500 leading-relaxed">中间是编辑区域，在这里创作你的故事。支持富文本格式、字数统计和合规检测。</p>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-2">
            <h3 className="text-xl font-bold">AI 工具箱</h3>
            <p className="text-sm text-gray-500 leading-relaxed">右侧是AI工具箱——续写、润色、脑洞喷射，让你的创作如虎添翼。</p>
          </div>
        )}
        <div className="flex gap-3 justify-center mt-8">
          <button onClick={onClose} className="px-5 py-2 rounded-lg text-sm text-gray-400 hover:text-gray-600 transition-colors">跳过</button>
          <button onClick={step < 2 ? onNext : onClose}
            className="px-5 py-2 rounded-lg text-sm bg-[#6B8C6E] text-white hover:bg-[#5a7a5e] transition-colors">
            {step === 2 ? '开始写作' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  )
}
