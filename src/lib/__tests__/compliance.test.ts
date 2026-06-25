// 合规检测单元测试
import { describe, it, expect } from 'vitest'
import { checkCompliance, calcBodyDensity } from '../compliance'

describe('checkCompliance', () => {
  it('空文本无违规', () => {
    const r = checkCompliance('')
    expect(r.forbiddenB).toBe(0)
    expect(r.blockedItems).toHaveLength(0)
  })

  it('B类词同段3次触发', () => {
    const r = checkCompliance('他突然站起来。他感觉很累。他非常疲惫。')
    expect(r.forbiddenB).toBe(1)
  })

  it('B类词同段2次不触发("突然"+"感觉"+没有"很"=.也只有两次吗? 注意"很"也是B类)', () => {
    // "他突然站起来。他感觉很累。" → "突然"×1 + "感觉"×1 + "很"×1 = 3
    const r = checkCompliance('他突然站起来。他感觉疲惫。')
    expect(r.forbiddenB).toBe(0)
  })

  it('动作句后跟解释标记', () => {
    const r = checkCompliance('他站起身。因为他很生气。')
    expect(r.blockedItems.some(b => b.type === 'explanation_after_action')).toBe(true)
  })

  it('动作句后不跟解释不标记', () => {
    const r = checkCompliance('他站起身。他走到窗边。')
    expect(r.blockedItems.filter(b => b.type === 'explanation_after_action')).toHaveLength(0)
  })
})

describe('calcBodyDensity', () => {
  it('空文本密度为0', () => {
    expect(calcBodyDensity('')).toBe(0)
  })

  it('全部动作句密度100%', () => {
    expect(calcBodyDensity('他转身。她抬头。我握手。')).toBe(100)
  })

  it('无动作句密度0%', () => {
    expect(calcBodyDensity('这是一个好日子。天气很晴朗。')).toBe(0)
  })
})
