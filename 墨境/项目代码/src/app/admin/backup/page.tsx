'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'

export default function BackupPage() {
  const [loading, setLoading] = useState(false);

  const handleBackup = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/backup', { method: 'POST' });
      if (!res.ok) throw new Error('备份失败');
      const data = await res.json();
      alert(data.message || '备份成功');
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '备份失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-lg font-semibold mb-6">数据备份</h2>
      <Card>
        <CardContent className="p-6">
          <p className="text-sm text-muted-foreground mb-4">
            备份将导出所有作品、章节、角色和系统配置数据的 SQL 文件。
          </p>
          <Button disabled={loading} onClick={handleBackup}>
            {loading ? "备份中..." : "立即备份"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
