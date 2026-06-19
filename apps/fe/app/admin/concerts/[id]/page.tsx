"use client";

import { useEffect, useState, use } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { 
  getConcertById, 
  getLocalTicketTypes, 
  createTicketType, 
  updateTicketType, 
  deleteTicketType,
  getFriendlyErrorMessage,
  uploadArtistBioPdf,
  getAiBioStatus,
  updateConcertBio
} from '@/lib/api';
import { ArrowLeft, Plus, Edit2, Trash2, Calendar, DollarSign, Users, Clock, FileText, Upload, Sparkles, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import Link from 'next/link';

interface AdminConcertDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function AdminConcertDetailPage({ params }: AdminConcertDetailPageProps) {
  const { id: concertId } = use(params);
  const [concert, setConcert] = useState<any>(null);
  const [ticketTypes, setTicketTypes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Tab State
  const [activeTab, setActiveTab] = useState<'tickets' | 'bio'>('tickets');

  // Ticket Form State
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [totalQuantity, setTotalQuantity] = useState('');
  const [maxPerUser, setMaxPerUser] = useState('4');
  const [saleStartAt, setSaleStartAt] = useState('');
  const [saleEndAt, setSaleEndAt] = useState('');

  // Bio Form State
  const [bioFile, setBioFile] = useState<File | null>(null);
  const [bioStatus, setBioStatus] = useState<'EMPTY' | 'PROCESSING' | 'DONE' | 'FAILED'>('EMPTY');
  const [bioText, setBioText] = useState('');
  const [bioLoading, setBioLoading] = useState(false);
  const [bioError, setBioError] = useState('');
  const [bioSuccess, setBioSuccess] = useState('');

  useEffect(() => {
    async function loadData() {
      try {
        const concertData = await getConcertById(concertId);
        setConcert(concertData);
        
        // Load ticket types (combining DB and LocalStorage fallback)
        const localTypes = getLocalTicketTypes(concertId);
        setTicketTypes(localTypes);

        // Load Bio initial state
        const bioData = await getAiBioStatus(concertId);
        setBioStatus(bioData.status);
        setBioText(bioData.bio || '');
      } catch (err) {
        setError(getFriendlyErrorMessage(err));
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [concertId]);

  // Polling for AI Bio processing status
  useEffect(() => {
    let intervalId: any;
    
    if (bioStatus === 'PROCESSING') {
      intervalId = setInterval(async () => {
        try {
          const res = await getAiBioStatus(concertId);
          if (res.status === 'DONE') {
            setBioStatus('DONE');
            setBioText(res.bio || '');
            setBioSuccess('Sinh tiểu sử nghệ sĩ bằng AI thành công!');
            clearInterval(intervalId);
          } else if (res.status === 'FAILED') {
            setBioStatus('FAILED');
            setBioError('Sinh tiểu sử nghệ sĩ bằng AI thất bại.');
            clearInterval(intervalId);
          }
        } catch (err) {
          console.error('Error polling bio status:', err);
        }
      }, 2000);
    }
    
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [bioStatus, concertId]);

  function resetForm() {
    setEditingId(null);
    setName('');
    setPrice('');
    setTotalQuantity('');
    setMaxPerUser('4');
    setSaleStartAt('');
    setSaleEndAt('');
  }

  function validate() {
    if (!name.trim()) return 'Vui lòng nhập tên hạng vé.';
    if (Number(price) <= 0) return 'Giá vé phải lớn hơn 0.';
    if (Number(totalQuantity) <= 0) return 'Số lượng vé phải lớn hơn 0.';
    if (Number(maxPerUser) < 1) return 'Số lượng mua tối đa phải ít nhất là 1.';
    if (saleStartAt && saleEndAt && new Date(saleStartAt) >= new Date(saleEndAt)) {
      return 'Thời gian bắt đầu bán phải trước thời gian kết thúc.';
    }
    return '';
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');

    const validationMsg = validate();
    if (validationMsg) {
      setError(validationMsg);
      return;
    }

    try {
      const payload = {
        name: name.trim(),
        price: Number(price),
        totalQuantity: Number(totalQuantity),
        maxPerUser: Number(maxPerUser),
        saleStartAt: saleStartAt || null,
        saleEndAt: saleEndAt || null,
      };

      if (editingId) {
        await updateTicketType(concertId, editingId, payload);
        setSuccess('Cập nhật hạng vé thành công!');
      } else {
        await createTicketType(concertId, payload);
        setSuccess('Tạo hạng vé thành công!');
      }

      // Refresh list
      setTicketTypes(getLocalTicketTypes(concertId));
      resetForm();
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  }

  function handleEdit(t: any) {
    setEditingId(t.id);
    setName(t.name);
    setPrice(t.price.toString());
    setTotalQuantity(t.totalQuantity.toString());
    setMaxPerUser(t.maxPerUser.toString());
    setSaleStartAt(t.saleStartAt ? t.saleStartAt.substring(0, 16) : '');
    setSaleEndAt(t.saleEndAt ? t.saleEndAt.substring(0, 16) : '');
  }

  async function handleDelete(ticketTypeId: string) {
    if (!confirm('Bạn có chắc chắn muốn xóa hạng vé này không?')) return;
    setError('');
    setSuccess('');
    try {
      await deleteTicketType(concertId, ticketTypeId);
      setSuccess('Xóa hạng vé thành công!');
      setTicketTypes(getLocalTicketTypes(concertId));
    } catch (err) {
      setError(getFriendlyErrorMessage(err));
    }
  }

  // AI Bio Handlers
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] || null;
    if (file && file.type === 'application/pdf') {
      setBioFile(file);
      setBioError('');
    } else {
      setBioFile(null);
      setBioError('Vui lòng chỉ tải lên file định dạng PDF.');
    }
  }

  async function handleBioUploadSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bioFile) return;

    setBioLoading(true);
    setBioError('');
    setBioSuccess('');
    try {
      await uploadArtistBioPdf(concertId, bioFile);
      setBioStatus('PROCESSING');
      setBioSuccess('Đang tải lên PDF và phân tích tạo bio bằng AI...');
      setBioFile(null);
    } catch (err) {
      setBioError(getFriendlyErrorMessage(err));
    } finally {
      setBioLoading(false);
    }
  }

  async function handleBioSave(e: React.FormEvent) {
    e.preventDefault();
    setBioLoading(true);
    setBioError('');
    setBioSuccess('');
    try {
      await updateConcertBio(concertId, bioText);
      setBioSuccess('Tiểu sử nghệ sĩ đã được cập nhật thành công!');
    } catch (err) {
      setBioError(getFriendlyErrorMessage(err));
    } finally {
      setBioLoading(false);
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="size-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        <Link
          href="/admin/concerts"
          className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-4 py-2 text-sm font-bold text-foreground shadow-sm transition hover:border-primary/40 hover:text-primary"
        >
          <ArrowLeft className="size-4" />
          Quản lý sự kiện
        </Link>

        {concert && (
          <div className="p-6 bg-card border border-border rounded-3xl">
            <h1 className="text-3xl font-black text-foreground">{concert.title}</h1>
            <p className="text-muted-foreground mt-1">{concert.artist} · {concert.venue}, {concert.city}</p>
          </div>
        )}

        {/* Tab Selection */}
        <div className="flex border-b border-border gap-6">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`pb-4 text-base font-black transition-all relative cursor-pointer ${
              activeTab === 'tickets' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Hạng vé sự kiện
            {activeTab === 'tickets' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
          <button
            onClick={() => setActiveTab('bio')}
            className={`pb-4 text-base font-black transition-all relative cursor-pointer ${
              activeTab === 'bio' ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <Sparkles className="size-4" />
              Tiểu sử nghệ sĩ AI
            </span>
            {activeTab === 'bio' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary rounded-full" />
            )}
          </button>
        </div>

        {activeTab === 'tickets' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Form */}
            <div className="lg:col-span-1 rounded-[2rem] border border-border bg-card p-6 shadow-sm">
              <h2 className="text-xl font-black text-foreground mb-6">
                {editingId ? 'Sửa hạng vé' : 'Thêm hạng vé mới'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Tên hạng vé</label>
                  <input
                    type="text"
                    placeholder="Ví dụ: Vé VIP, Vé GA..."
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="h-11 w-full rounded-2xl border border-border bg-background px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Giá vé (VNĐ)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Mệnh giá"
                      value={price ? Number(price.replace(/\D/g, '')).toLocaleString('vi-VN') : ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setPrice(raw);
                      }}
                      className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Số lượng</label>
                    <div className="relative">
                      <Users className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                      <input
                        type="number"
                        placeholder="Tổng số vé"
                        value={totalQuantity}
                        onChange={(e) => setTotalQuantity(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-foreground mb-2">Max / User</label>
                    <input
                      type="number"
                      placeholder="4"
                      value={maxPerUser}
                      onChange={(e) => setMaxPerUser(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Mở bán lúc</label>
                  <div className="relative">
                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="datetime-local"
                      value={saleStartAt}
                      onChange={(e) => setSaleStartAt(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 focus:outline-none focus:ring-4 focus:ring-primary/15 text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-foreground mb-2">Đóng bán lúc</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                    <input
                      type="datetime-local"
                      value={saleEndAt}
                      onChange={(e) => setSaleEndAt(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background pl-10 pr-4 focus:outline-none focus:ring-4 focus:ring-primary/15 text-sm"
                    />
                  </div>
                </div>

                {error && (
                  <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
                    {error}
                  </p>
                )}

                {success && (
                  <p className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm font-semibold text-emerald-500">
                    {success}
                  </p>
                )}

                <div className="flex gap-2 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 rounded-full border border-border px-4 py-2 text-sm font-bold hover:bg-muted"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 rounded-full bg-primary py-2 text-sm font-bold text-primary-foreground hover:bg-primary/90 transition cursor-pointer"
                  >
                    {editingId ? 'Lưu thay đổi' : 'Tạo hạng vé'}
                  </button>
                </div>
              </form>
            </div>

            {/* List */}
            <div className="lg:col-span-2 rounded-[2rem] border border-border bg-card p-6 shadow-sm overflow-hidden">
              <h2 className="text-xl font-black text-foreground mb-6">Các hạng vé hiện có</h2>
              
              {ticketTypes.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  Chưa có hạng vé nào được cấu hình.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border text-sm font-bold text-muted-foreground pb-4">
                        <th className="pb-3">Hạng vé</th>
                        <th className="pb-3">Giá vé</th>
                        <th className="pb-3 text-center">Số lượng</th>
                        <th className="pb-3 text-center">Max/User</th>
                        <th className="pb-3 text-right">Thao tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {ticketTypes.map((t) => (
                        <tr key={t.id} className="text-sm">
                          <td className="py-4 font-bold text-foreground">{t.name}</td>
                          <td className="py-4 text-primary font-bold">{t.price.toLocaleString('vi-VN')}đ</td>
                          <td className="py-4 text-center">{t.totalQuantity}</td>
                          <td className="py-4 text-center">{t.maxPerUser}</td>
                          <td className="py-4 text-right">
                            <div className="flex gap-1 justify-end">
                              <button
                                onClick={() => handleEdit(t)}
                                className="rounded-full p-2 text-muted-foreground hover:bg-primary/10 hover:text-primary transition cursor-pointer"
                                aria-label="Sửa hạng vé"
                              >
                                <Edit2 className="size-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(t.id)}
                                className="rounded-full p-2 text-rose-500 hover:bg-rose-500/10 transition cursor-pointer"
                                aria-label="Xóa hạng vé"
                              >
                                <Trash2 className="size-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Upload form */}
            <div className="lg:col-span-1 rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col justify-between">
              <div>
                <h2 className="text-xl font-black text-foreground mb-2 flex items-center gap-1.5">
                  <Sparkles className="size-5 text-primary" />
                  Sinh tiểu sử AI
                </h2>
                <p className="text-muted-foreground text-sm mb-6">
                  Tải lên file PDF tiểu sử nghệ sĩ để AI tự động trích xuất và thiết kế tiểu sử nghệ sĩ chuyên nghiệp.
                </p>

                <form onSubmit={handleBioUploadSubmit} className="space-y-4">
                  <div className="border-2 border-dashed border-border hover:border-primary/50 transition rounded-3xl p-6 text-center cursor-pointer relative group">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <Upload className="size-8 mx-auto text-muted-foreground group-hover:text-primary transition mb-3" />
                    <p className="text-sm font-bold text-foreground">
                      {bioFile ? bioFile.name : 'Chọn file tài liệu PDF'}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {bioFile ? `${(bioFile.size / 1024 / 1024).toFixed(2)} MB` : 'Dung lượng tối đa 10MB'}
                    </p>
                  </div>

                  {bioError && (
                    <div className="flex gap-2 rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive font-semibold">
                      <AlertCircle className="size-5 flex-shrink-0" />
                      <span>{bioError}</span>
                    </div>
                  )}

                  {bioSuccess && (
                    <div className="flex gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-500 font-semibold">
                      <CheckCircle2 className="size-5 flex-shrink-0" />
                      <span>{bioSuccess}</span>
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!bioFile || bioLoading}
                    className="w-full h-11 rounded-full bg-primary font-bold text-primary-foreground hover:bg-primary/90 transition flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {bioLoading ? (
                      <RefreshCw className="size-4 animate-spin" />
                    ) : (
                      <Sparkles className="size-4" />
                    )}
                    Bắt đầu sinh Bio
                  </button>
                </form>
              </div>

              {/* Status Indicator */}
              <div className="mt-8 pt-6 border-t border-border">
                <p className="text-xs text-muted-foreground font-bold uppercase tracking-wider mb-2">Trạng thái xử lý AI</p>
                <div className="flex items-center gap-2">
                  <span
                    className={`size-2.5 rounded-full ${
                      bioStatus === 'DONE'
                        ? 'bg-emerald-500'
                        : bioStatus === 'PROCESSING'
                        ? 'bg-amber-500 animate-pulse'
                        : bioStatus === 'FAILED'
                        ? 'bg-rose-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <span className="text-sm font-bold text-foreground">
                    {bioStatus === 'DONE'
                      ? 'Đã hoàn thành'
                      : bioStatus === 'PROCESSING'
                      ? 'Đang phân tích...'
                      : bioStatus === 'FAILED'
                      ? 'Lỗi xử lý'
                      : 'Trống (Chưa có PDF)'}
                  </span>
                </div>
              </div>
            </div>

            {/* Bio Editor Area */}
            <div className="lg:col-span-2 rounded-[2rem] border border-border bg-card p-6 shadow-sm flex flex-col h-full min-h-[420px]">
              <h2 className="text-xl font-black text-foreground mb-4 flex items-center gap-2">
                <FileText className="size-5 text-primary" />
                Nội dung tiểu sử nghệ sĩ
              </h2>

              <form onSubmit={handleBioSave} className="flex-1 flex flex-col gap-4">
                <textarea
                  placeholder="Tiểu sử nghệ sĩ sẽ hiển thị tại đây sau khi sinh ra từ AI hoặc bạn có thể tự soạn thảo/chỉnh sửa tại đây..."
                  value={bioText}
                  onChange={(e) => setBioText(e.target.value)}
                  className="flex-grow w-full min-h-[300px] rounded-3xl border border-border bg-background p-5 focus:outline-none focus:ring-4 focus:ring-primary/15 text-foreground leading-relaxed resize-none"
                />

                <div className="flex justify-end pt-2">
                  <button
                    type="submit"
                    disabled={bioLoading || !bioText.trim()}
                    className="h-11 rounded-full bg-primary px-8 font-bold text-primary-foreground hover:bg-primary/90 transition flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                  >
                    Lưu & Cập nhật Bio
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
