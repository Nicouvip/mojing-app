import os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

with open('墨境/项目代码/src/components/audiobook/dialogue-mode.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# The button area to replace
old = """<div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10 }}>
          <input ref={importBookRef} type="file" accept=".txt,.json" onChange={handleImportBook} style={{ display: 'none' }} />
          <button onClick={() => importBookRef.current?.click()} disabled={importBookLoading || analyzing}
            style={{ padding: '8px 20px', background: C.indigo, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: importBookLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: importBookLoading ? 0.6 : 1 }}>
            {importBookLoading ? '⏳ 导入中...' : '📄 导入画本（跳过AI）'}
          </button>
        </div>"""

new = """<div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 10, flexWrap: 'wrap' }}>
          <input ref={importBookRef} type="file" accept=".txt,.json" onChange={handleImportBook} style={{ display: 'none' }} />
          <button onClick={() => importBookRef.current?.click()} disabled={importBookLoading || analyzing}
            style={{ padding: '8px 16px', background: C.indigo, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: importBookLoading ? 'default' : 'pointer', fontFamily: 'inherit', opacity: importBookLoading ? 0.6 : 1 }}>
            {importBookLoading ? '...' : '📄 导入画本'}
          </button>
          <button onClick={() => {
            const contentText = chapter.content || '';
            if (!contentText) { alert('该章节暂无内容'); return; }
            const lines = contentText.split(/\\n/).filter(l => l.trim());
            const manualSegments = lines.map((line, i) => ({
              index: i, type: 'narration', text: line.trim(), characterName: '旁白',
              emotion: '平静', emotionIntensity: 5, recommendedVoice: defaultVoice,
              speed: 'normal', needsPause: false, pauseAfter: 'normal', specialNote: '',
            }));
            const manualCharacters = [{ name: '旁白', gender: 'female', age: 'adult', personality: '旁白叙述', recommendedVoice: defaultVoice, recommendedEmotion: '平静' }];
            setEditedSegments(manualSegments);
            setEditedCharacters(manualCharacters);
            setAnalysisResult({ characters: manualCharacters, segments: manualSegments, narrationStyle: { overallTone: '平静', suggestedNarratorVoice: '冰糖', pacing: 'normal' } });
          }}
            style={{ padding: '8px 16px', background: C.green, border: 'none', borderRadius: 6, fontSize: 12, fontWeight: 500, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✏️ 手动设置
          </button>
        </div>"""

if old in content:
    content = content.replace(old, new, 1)
    with open('墨境/项目代码/src/components/audiobook/dialogue-mode.tsx', 'w', encoding='utf-8') as f:
        f.write(content)
    print('Fixed: added manual setup button')
else:
    print('Pattern not found - searching...')
    # Check if import button exists
    if '导入画本' in content:
        print('Found 导入画本 text')
    else:
        print('导入画本 not found in file')
