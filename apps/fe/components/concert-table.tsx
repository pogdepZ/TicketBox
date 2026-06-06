import { Edit, Trash2, Eye } from 'lucide-react';

interface ConcertTableProps {
  concerts: Array<{
    id: string;
    title: string;
    artist: string;
    date: string;
    venue: string;
    capacity: number;
    status?: string;
  }>;
}

export function ConcertTable({ concerts }: ConcertTableProps) {
  return (
    <div className="bg-card border border-border rounded-lg overflow-hidden">
      <table className="w-full">
        <thead className="bg-muted border-b border-border">
          <tr>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Sự kiện</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Nghệ sĩ</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Ngày</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Địa điểm</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Sức chứa</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Trạng thái</th>
            <th className="px-6 py-3 text-left text-sm font-semibold text-foreground">Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {concerts.map((concert) => (
            <tr key={concert.id} className="hover:bg-muted/50 transition">
              <td className="px-6 py-3 text-foreground font-medium">{concert.title}</td>
              <td className="px-6 py-3 text-muted-foreground">{concert.artist}</td>
              <td className="px-6 py-3 text-muted-foreground">
                {new Date(concert.date).toLocaleDateString('vi-VN')}
              </td>
              <td className="px-6 py-3 text-muted-foreground">{concert.venue}</td>
              <td className="px-6 py-3 text-muted-foreground">{concert.capacity.toLocaleString('vi-VN')}</td>
              <td className="px-6 py-3">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  {concert.status ?? 'Đang bán'}
                </span>
              </td>
              <td className="px-6 py-3">
                <div className="flex gap-2">
                  <button className="p-1 text-primary hover:bg-primary/10 rounded transition" aria-label="Xem sự kiện">
                    <Eye className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-primary hover:bg-primary/10 rounded transition" aria-label="Sửa sự kiện">
                    <Edit className="w-4 h-4" />
                  </button>
                  <button className="p-1 text-destructive hover:bg-destructive/10 rounded transition" aria-label="Xóa sự kiện">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
