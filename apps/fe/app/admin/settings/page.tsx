"use client";

import { useState } from 'react';
import { AdminLayout } from '@/components/admin-layout';
import { Settings, Shield, Bell, CreditCard, Mail, Key, Save } from 'lucide-react';

export default function AdminSettingsPage() {
  const admin = { name: 'Admin', role: 'Super Admin' };
  
  const [activeTab, setActiveTab] = useState<'general' | 'payment' | 'email' | 'security'>('general');
  const [companyName, setCompanyName] = useState('TicketBox Việt Nam');
  const [supportEmail, setSupportEmail] = useState('support@ticketbox.vn');
  const [commissionRate, setCommissionRate] = useState('5');
  const [vatRate, setVatRate] = useState('10');
  
  const [notifyOrder, setNotifyOrder] = useState(true);
  const [notifyRefund, setNotifyRefund] = useState(true);
  const [notifyDailyReport, setNotifyDailyReport] = useState(false);
  
  const [isSaving, setIsSaving] = useState(false);

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setIsSaving(true);
    
    setTimeout(() => {
      setIsSaving(false);
      window.dispatchEvent(
        new CustomEvent('ticketbox-toast', {
          detail: {
            title: 'Lưu cấu hình thành công',
            message: 'Các thay đổi về hệ thống và thông tin vận hành đã được cập nhật.',
            type: 'success',
          },
        })
      );
    }, 800);
  }

  const tabs = [
    { id: 'general', label: 'Chung', icon: Settings },
    { id: 'payment', label: 'Thanh toán', icon: CreditCard },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'security', label: 'Bảo mật', icon: Key },
  ] as const;

  return (
    <AdminLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-foreground flex items-center gap-3">
            <Settings className="size-9 text-primary" />
            Cài đặt
          </h1>
          <p className="text-muted-foreground mt-1">Quản lý cấu hình hệ thống và thông tin vận hành</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Tabs Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-8 overflow-hidden rounded-3xl border border-border bg-card shadow-sm p-4">
              <nav className="space-y-1">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex w-full items-center gap-3 rounded-2xl px-4 py-2.5 text-left font-bold transition duration-200 cursor-pointer ${
                        active
                          ? 'bg-primary/10 text-primary'
                          : 'text-muted-foreground hover:bg-muted/70 hover:text-foreground'
                      }`}
                    >
                      <Icon className="size-4.5" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="lg:col-span-2">
            <form onSubmit={handleSave} className="space-y-6 rounded-[2rem] border border-border bg-card p-6 shadow-sm md:p-8">
              
              {activeTab === 'general' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Tên công ty</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Tài khoản quản trị</label>
                    <input
                      type="text"
                      disabled
                      value={`${admin.name} - ${admin.role}`}
                      className="h-11 w-full rounded-2xl border border-border bg-muted/50 px-4 text-sm text-muted-foreground cursor-not-allowed"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Email hỗ trợ</label>
                    <input
                      type="email"
                      value={supportEmail}
                      onChange={(e) => setSupportEmail(e.target.value)}
                      className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 transition"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Tỷ lệ hoa hồng (%)</label>
                      <input
                        type="number"
                        value={commissionRate}
                        onChange={(e) => setCommissionRate(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 transition"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Tỷ lệ VAT (%)</label>
                      <input
                        type="number"
                        value={vatRate}
                        onChange={(e) => setVatRate(e.target.value)}
                        className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15 transition"
                      />
                    </div>
                  </div>

                  <div className="border-t border-border pt-6">
                    <h3 className="mb-4 text-lg font-black text-foreground flex items-center gap-2">
                      <Bell className="size-5 text-primary" />
                      Thông báo email
                    </h3>
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={notifyOrder}
                          onChange={(e) => setNotifyOrder(e.target.checked)}
                          className="size-4 rounded border-border text-primary focus:ring-primary/15 accent-primary cursor-pointer"
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition font-medium">Nhận email khi có đơn hàng mới</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={notifyRefund}
                          onChange={(e) => setNotifyRefund(e.target.checked)}
                          className="size-4 rounded border-border text-primary focus:ring-primary/15 accent-primary cursor-pointer"
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition font-medium">Nhận email khi vé được hoàn lại</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={notifyDailyReport}
                          onChange={(e) => setNotifyDailyReport(e.target.checked)}
                          className="size-4 rounded border-border text-primary focus:ring-primary/15 accent-primary cursor-pointer"
                        />
                        <span className="text-sm text-foreground group-hover:text-primary transition font-medium">Nhận email báo cáo doanh thu hằng ngày</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'payment' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                    <CreditCard className="size-5 text-primary" />
                    Cấu hình Cổng thanh toán
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Thiết lập tích hợp và mã đối tác (Partner Code) của MoMo và VNPay phục vụ thanh toán vé trực tuyến.
                  </p>
                  
                  <div className="space-y-4">
                    <div className="p-4 rounded-2xl border border-border bg-muted/20">
                      <p className="font-bold text-foreground mb-3 text-sm">Cổng MoMo</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">Mã đối tác (Partner Code)</label>
                          <input type="text" defaultValue="MOCK_MOMO_PARTNER_CODE" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none" />
                        </div>
                      </div>
                    </div>

                    <div className="p-4 rounded-2xl border border-border bg-muted/20">
                      <p className="font-bold text-foreground mb-3 text-sm">Cổng VNPay</p>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground mb-1">Mã Website (vnp_TmnCode)</label>
                          <input type="text" defaultValue="MOCK_VNPAY_TMNCODE" className="h-10 w-full rounded-xl border border-border bg-background px-3 text-xs text-foreground focus:outline-none" />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'email' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                    <Mail className="size-5 text-primary" />
                    Cấu hình SMTP Server
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Sử dụng để gửi vé điện tử (e-ticket) và mã OTP đăng ký tài khoản cho khách hàng.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">SMTP Host</label>
                      <input type="text" defaultValue="smtp.gmail.com" className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none focus:ring-4 focus:ring-primary/15" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">SMTP Port</label>
                        <input type="text" defaultValue="587" className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">SMTP Encryption</label>
                        <select className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none">
                          <option value="tls">STARTTLS</option>
                          <option value="ssl">SSL/TLS</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'security' && (
                <div className="space-y-6">
                  <h3 className="text-lg font-black text-foreground flex items-center gap-2">
                    <Shield className="size-5 text-primary" />
                    Bảo mật và Phân quyền
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Cấu hình thời gian sống của Token truy cập (JWT Access Token) và thiết lập mật khẩu mặc định cho các tài khoản mới.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Thời hạn Access Token (giây)</label>
                      <input type="number" defaultValue="3600" className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground mb-2">Mức độ mật khẩu tối thiểu</label>
                      <select className="h-11 w-full rounded-2xl border border-border bg-background px-4 text-sm text-foreground focus:outline-none">
                        <option value="medium">Tối thiểu 8 ký tự (chữ và số)</option>
                        <option value="high">Bắt buộc bao gồm chữ hoa, số và ký tự đặc biệt</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-6 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 font-bold text-primary-foreground transition hover:bg-primary/90 hover:-translate-y-0.5 active:translate-y-px cursor-pointer disabled:opacity-50 disabled:pointer-events-none text-sm"
                >
                  {isSaving ? (
                    <span className="size-4.5 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin"></span>
                  ) : (
                    <>
                      <Save className="size-4" />
                      Lưu cài đặt
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
