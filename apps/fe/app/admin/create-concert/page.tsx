"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin-layout';
import { createConcert, getFriendlyErrorMessage } from '@/lib/api';
import { ArrowLeft, RefreshCw, AlertCircle, Plus, Trash2, Calendar, Clock } from 'lucide-react';
import Link from 'next/link';
import { DatePicker, TimePicker } from '@/components/date-time-picker';

export default function CreateConcertPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [artistName, setArtistName] = useState('');
  const [description, setDescription] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [eventTime, setEventTime] = useState('');
  const [venueName, setVenueName] = useState('');
  const [venueAddress, setVenueAddress] = useState('');
  const [posterUrl, setPosterUrl] = useState('');
  const [seatMapSvg, setSeatMapSvg] = useState('');

  const [ticketTypes, setTicketTypes] = useState<Array<{
    name: string;
    price: string;
    totalQuantity: string;
    maxPerUser: string;
  }>>([
    { name: 'SVIP', price: '1800000', totalQuantity: '50', maxPerUser: '4' },
    { name: 'VIP', price: '1200000', totalQuantity: '100', maxPerUser: '4' },
    { name: 'CAT1', price: '850000', totalQuantity: '150', maxPerUser: '4' },
    { name: 'CAT2', price: '600000', totalQuantity: '200', maxPerUser: '4' },
    { name: 'GA', price: '450000', totalQuantity: '300', maxPerUser: '4' },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const addTicketType = () => {
    setTicketTypes([...ticketTypes, { name: '', price: '', totalQuantity: '', maxPerUser: '4' }]);
  };

  const removeTicketType = (index: number) => {
    setTicketTypes(ticketTypes.filter((_, i) => i !== index));
  };

  const updateTicketType = (index: number, field: string, value: string) => {
    const updated = [...ticketTypes];
    updated[index] = { ...updated[index], [field]: value };
    setTicketTypes(updated);
  };

  function validate() {
    if (!name.trim()) return 'Vui lòng nhập tên sự kiện.';
    if (!venueName.trim()) return 'Vui lòng nhập tên địa điểm.';
    if (!venueAddress.trim()) return 'Vui lòng nhập địa chỉ địa điểm.';
    if (!eventDate || !eventTime) return 'Vui lòng nhập đầy đủ ngày và giờ diễn ra.';
    
    const parsedDate = new Date(`${eventDate}T${eventTime}`);
    if (Number.isNaN(parsedDate.getTime())) {
      return 'Thời gian diễn ra sự kiện không hợp lệ.';
    }
    if (parsedDate.getTime() <= Date.now()) {
      return 'Thời gian diễn ra sự kiện phải ở tương lai.';
    }

    for (let i = 0; i < ticketTypes.length; i++) {
      const t = ticketTypes[i];
      if (!t.name.trim()) {
        return `Vui lòng nhập tên cho hạng vé thứ ${i + 1}.`;
      }
      const priceVal = Number(t.price);
      if (Number.isNaN(priceVal) || priceVal < 0) {
        return `Giá vé hạng "${t.name}" không hợp lệ (phải >= 0).`;
      }
      const qtyVal = Number(t.totalQuantity);
      if (Number.isNaN(qtyVal) || !Number.isInteger(qtyVal) || qtyVal < 1) {
        return `Số lượng vé hạng "${t.name}" không hợp lệ (phải là số nguyên >= 1).`;
      }
      const maxVal = Number(t.maxPerUser);
      if (Number.isNaN(maxVal) || !Number.isInteger(maxVal) || maxVal < 1) {
        return `Số vé tối đa / user của hạng "${t.name}" không hợp lệ (phải là số nguyên >= 1).`;
      }
    }
    
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const validationMsg = validate();
    if (validationMsg) {
      setError(validationMsg);
      return;
    }

    setLoading(true);
    try {
      const parsedDate = new Date(`${eventDate}T${eventTime}`);
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        artistName: artistName.trim() || undefined,
        venueName: venueName.trim(),
        venueAddress: venueAddress.trim(),
        eventDate: parsedDate.toISOString(),
        posterUrl: posterUrl.trim() || undefined,
        seatMapSvg: seatMapSvg.trim() || undefined,
        ticketTypes: ticketTypes.length > 0 ? ticketTypes.map(t => ({
          name: t.name.trim(),
          price: Number(t.price),
          totalQuantity: Number(t.totalQuantity),
          maxPerUser: Number(t.maxPerUser),
        })) : undefined
      };

      const result = await createConcert(payload);
      
      // Dispatch toast alert
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Tạo sự kiện thành công',
            message: `Sự kiện "${result.name}" đã được khởi tạo thành công dưới dạng nháp!`,
            type: 'success',
          },
        })
      );

      // Redirect to configure tickets, bio, and guests
      router.push(`/admin/concerts/${result.id}`);
    } catch (err: any) {
      setError(getFriendlyErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <Link
          href="/admin/concerts"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Quay lại
        </Link>

        <div className="rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-8">
          <h1 className="mb-2 text-3xl font-black tracking-tight text-foreground">Tạo sự kiện mới</h1>
          <p className="text-muted-foreground mb-8">Thêm một sự kiện mới vào hệ thống dưới dạng nháp để bắt đầu cấu hình vé</p>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <h3 className="mb-4 text-lg font-black text-foreground">Thông tin cơ bản</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Tên sự kiện <span className="text-destructive">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Ví dụ: Đêm Nhạc Trịnh Công Sơn, Live Concert..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Nghệ sĩ biểu diễn</label>
                    <input
                      type="text"
                      placeholder="Ví dụ: Hà Anh Tuấn, Mỹ Tâm..."
                      value={artistName}
                      onChange={(e) => setArtistName(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Đường dẫn Poster sự kiện (URL)</label>
                    <input
                      type="url"
                      placeholder="https://example.com/poster.jpg"
                      value={posterUrl}
                      onChange={(e) => setPosterUrl(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-2">Mô tả sự kiện</label>
                  <textarea
                    placeholder="Nhập thông tin giới thiệu chi tiết về đêm nhạc..."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                    className="w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="mb-4 text-lg font-black text-foreground">Thời gian & Địa điểm</h3>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Ngày diễn ra <span className="text-destructive">*</span></label>
                    <DatePicker
                      value={eventDate}
                      onChange={setEventDate}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Giờ bắt đầu <span className="text-destructive">*</span></label>
                    <TimePicker
                      value={eventTime}
                      onChange={setEventTime}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Tên địa điểm <span className="text-destructive">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: Sân vận động Quân khu 7, Nhà hát Hòa Bình..."
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">Địa chỉ chi tiết địa điểm <span className="text-destructive">*</span></label>
                    <input
                      type="text"
                      required
                      placeholder="Ví dụ: 202 Hoàng Văn Thụ, Phường 9, Phú Nhuận..."
                      value={venueAddress}
                      onChange={(e) => setVenueAddress(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-border pt-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-black text-foreground">Cấu hình hạng vé</h3>
                  <p className="text-xs text-muted-foreground mt-1">Cấu hình các hạng vé của sự kiện, giá bán, số lượng phát hành và số vé tối đa mỗi khách hàng được mua.</p>
                </div>
                <button
                  type="button"
                  onClick={addTicketType}
                  className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-4 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 transition cursor-pointer"
                >
                  <Plus className="size-3.5" />
                  Thêm hạng vé
                </button>
              </div>

              {ticketTypes.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-border p-6 text-center">
                  <p className="text-sm text-muted-foreground">Chưa cấu hình hạng vé nào. Click "Thêm hạng vé" để cấu hình.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {ticketTypes.map((t, idx) => (
                    <div key={idx} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end rounded-2xl border border-border bg-card p-4 relative group hover:border-primary/30 transition">
                      <div className="sm:col-span-4">
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tên hạng vé (Ví dụ: VIP, GA...)</label>
                        <input
                          type="text"
                          required
                          placeholder="Tên hạng vé"
                          value={t.name}
                          onChange={(e) => updateTicketType(idx, 'name', e.target.value)}
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>
                      
                      <div className="sm:col-span-3">
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Giá bán (VNĐ)</label>
                        <input
                          type="number"
                          required
                          min="0"
                          placeholder="Giá bán"
                          value={t.price}
                          onChange={(e) => updateTicketType(idx, 'price', e.target.value)}
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tổng số lượng</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Ví dụ: 100"
                          value={t.totalQuantity}
                          onChange={(e) => updateTicketType(idx, 'totalQuantity', e.target.value)}
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-semibold text-muted-foreground mb-1.5">Tối đa/người mua</label>
                        <input
                          type="number"
                          required
                          min="1"
                          placeholder="Ví dụ: 4"
                          value={t.maxPerUser}
                          onChange={(e) => updateTicketType(idx, 'maxPerUser', e.target.value)}
                          className="h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-center pb-0.5">
                        <button
                          type="button"
                          onClick={() => removeTicketType(idx)}
                          className="p-2 rounded-xl text-destructive/70 hover:text-destructive hover:bg-destructive/10 transition cursor-pointer"
                          title="Xóa hạng vé"
                        >
                          <Trash2 className="size-5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="border-t border-border pt-6">
              <h3 className="mb-2 text-lg font-black text-foreground">Sơ đồ chỗ ngồi (Tùy chọn)</h3>
              <p className="text-xs text-muted-foreground mb-4">Bạn có thể dán đoạn mã SVG thiết kế sơ đồ ghế vào ô dưới đây (ví dụ: &lt;svg&gt;...&lt;/svg&gt;).</p>
              <div>
                <textarea
                  placeholder="Dán mã SVG sơ đồ ghế tại đây..."
                  value={seatMapSvg}
                  onChange={(e) => setSeatMapSvg(e.target.value)}
                  rows={3}
                  className="w-full font-mono text-xs rounded-2xl border border-border bg-background px-4 py-3 text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15"
                />
              </div>
            </div>

            {error && (
              <div className="flex gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive font-semibold">
                <AlertCircle className="size-5 flex-shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="border-t border-border pt-6 flex gap-4 justify-end">
              <Link
                href="/admin/concerts"
                className="rounded-full border border-border px-6 py-3 font-bold text-foreground transition hover:border-primary/40 hover:text-primary"
              >
                Hủy
              </Link>
              <button
                type="submit"
                disabled={loading}
                className="rounded-full bg-primary px-8 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {loading && <RefreshCw className="size-4 animate-spin" />}
                Tạo sự kiện
              </button>
            </div>
          </form>
        </div>
      </div>
    </AdminLayout>
  );
}
