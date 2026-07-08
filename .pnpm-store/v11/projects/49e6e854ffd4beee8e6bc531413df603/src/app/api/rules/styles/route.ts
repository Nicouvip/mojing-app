// ============================================================
// 墨境 API — 风格规则中心
// GET /api/rules/styles — 返回当前可用风格列表+参数
// 支撑"风格规则中心"页面
// ============================================================

import { NextResponse } from 'next/server'
import { CONFLICT_LEVELS, GENRE_MAP } from '@/lib/prompts'
import { NARRATIVE_FUNCTION_CONFIGS, UNBLOCK_CONFIGS, ENDING_TYPES } from '@/lib/prompts/builder'
import { COOLING_REQUIREMENTS } from '@/lib/ai/cooling'

export async function GET() {
  try {
    const styles = [
    {
      id: 'bianbai',
      name: '冷峻白描',
      description: '默认风格。短句(8-15字)，句号多，无评价性锚点，55字线严格执行',
      exemptions: ['无豁免'],
      strengthen: ['身体优先升级'],
      suitable: ['悬疑', '灵异', '文学向'],
      sentenceLength: '8-15字',
      dialogueRatio: '标准',
    },
    {
      id: 'kuaixiao',
      name: '快消口语',
      description: '番茄风优化版。B类禁用词L1-L2放宽，对话占比≥35%，评价性锚点每500字≥1次',
      exemptions: ['B类禁用词放宽', 'C类连接词完全放开', '不定义情绪每500字可定义1次'],
      strengthen: ['对话占比≥35%（番茄≥40%）', '逗号/句号比≥1.5:1', '前三章评价性锚点每300字1次'],
      suitable: ['言情', '都市', '番茄风'],
      sentenceLength: '10-20字',
      dialogueRatio: '≥35%',
    },
    {
      id: 'ganji',
      name: '感官极值',
      description: '恐怖/无限流向。身体密度≥60%，每段≥3种感官，允许极端形容词，适合强感官题材',
      exemptions: ['允许极端形容词'],
      strengthen: ['身体密度≥60%', '每段感官≥3种'],
      suitable: ['恐怖', '无限流'],
      sentenceLength: '长短混合',
      dialogueRatio: '标准',
    },
  ]

  const conflictLevels = (Object.entries(CONFLICT_LEVELS) as [string, typeof CONFLICT_LEVELS[keyof typeof CONFLICT_LEVELS]][]).map(([key, config]) => ({
    id: config.level,
    name: config.name,
    description: config.description,
    sentenceLength: config.sentenceLength,
    lineBreak: config.lineBreak,
    bodyDensityMin: config.bodyDensityMin,
    adjectiveLimit: config.adjectiveLimit,
    typicalScenes: config.typicalScenes,
  }))

  const genres = (Object.entries(GENRE_MAP) as [string, string][]).map(([key, label]) => ({
    id: key,
    name: label,
    params: {
      // 这里简化，完整参数见 types.ts GENRE_PARAMS
      supportsStyles: key === '通用' ? ['冷峻白描', '快消口语', '感官极值'] : ['冷峻白描', '快消口语'],
      supportsConflict: ['L1', 'L2', 'L3', 'L4', 'L5'],
    },
  }))

  const narrativeFunctions = (Object.entries(NARRATIVE_FUNCTION_CONFIGS) as [string, typeof NARRATIVE_FUNCTION_CONFIGS[keyof typeof NARRATIVE_FUNCTION_CONFIGS]][]).map(([key, config]) => ({
    id: config.type,
    name: config.name,
    rhythm: config.rhythm,
    sentenceFeature: config.sentenceFeature,
    anchorDensity: config.anchorDensity,
    visualTexture: config.visualTexture,
  }))

  const coolingRules = {
    scene: { required: COOLING_REQUIREMENTS.scene, description: '场景方法S1-S6，同方法需冷却3章' },
    ending: { required: COOLING_REQUIREMENTS.ending, description: '章末收束E1-E12，同编号需冷却3章' },
    hook: { required: COOLING_REQUIREMENTS.hook, description: '钩子H01-H13，同类型需冷却5章' },
    sense: { required: COOLING_REQUIREMENTS.sense, description: '感官通道6类，同感官需冷却3章' },
    emotion: { required: COOLING_REQUIREMENTS.emotion, description: '情感颜色，避免连续3章同色' },
    sentence: { required: COOLING_REQUIREMENTS.sentence, description: '句式类型，同类型需冷却5章' },
  }

  const endingTypes = ENDING_TYPES.map((e: typeof ENDING_TYPES[number]) => ({
    id: e.id,
    name: e.name,
    description: e.desc,
  }))

  const unblockMethods = (Object.entries(UNBLOCK_CONFIGS) as [string, typeof UNBLOCK_CONFIGS[keyof typeof UNBLOCK_CONFIGS]][]).map(([key, config]) => ({
    id: config.method,
    name: config.name,
    description: config.description,
    prompts: config.prompts,
  }))

  return NextResponse.json({
    styles,
    conflictLevels,
    genres,
    narrativeFunctions,
    coolingRules,
    endingTypes,
    unblockMethods,
  })
  } catch (e: unknown) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : '获取风格规则失败' },
      { status: 500 }
    )
  }
}
