'use client';

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button';

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
    <Card title="备份管理" style={{ margin: 24 }}>
      <Button disabled={loading} onClick={handleBackup}>
        立即备份
      </Button>
    </Card>
  );
}
