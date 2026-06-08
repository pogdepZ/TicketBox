"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogIn, UserPlus } from 'lucide-react';
import { loginMock, registerMock } from '@/lib/mock-auth';

type AuthMode = 'login' | 'register';

interface AuthFormProps {
  mode: AuthMode;
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('minhanh@example.com');
  const [password, setPassword] = useState('password123');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isLogin = mode === 'login';

  function validate() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Email không hợp lệ.';
    }

    if (password.length < 6) {
      return 'Mật khẩu cần tối thiểu 6 ký tự.';
    }

    if (!isLogin && fullName.trim().length === 0) {
      return 'Vui lòng nhập họ tên.';
    }

    return '';
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const validationMessage = validate();
    if (validationMessage) {
      setMessage(validationMessage);
      return;
    }

    setIsSubmitting(true);
    setMessage('');

    try {
      if (isLogin) {
        loginMock(email, password);
      } else {
        registerMock({ email, password, fullName, phone });
      }

      router.push('/');
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Không thể xử lý yêu cầu.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-[2rem] border border-border bg-card p-6 shadow-xl shadow-foreground/5 md:p-8">
      <div className="mb-7">
        <div className="mb-4 grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground">
          {isLogin ? <LogIn className="size-5" /> : <UserPlus className="size-5" />}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-foreground">
          {isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
        </h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          {isLogin
            ? 'Dùng tài khoản mock để tiếp tục đặt vé. Tài khoản mẫu: minhanh@example.com / password123.'
            : 'Tài khoản được lưu cục bộ trong trình duyệt để mô phỏng API đăng ký.'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {!isLogin && (
          <>
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">Họ tên</label>
              <input
                type="text"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-bold text-foreground">Số điện thoại</label>
              <input
                type="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                className="h-11 w-full rounded-2xl border border-border bg-background px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
              />
            </div>
          </>
        )}

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground">Email</label>
          <input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-background px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-bold text-foreground">Mật khẩu</label>
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 w-full rounded-2xl border border-border bg-background px-4 focus:outline-none focus:ring-4 focus:ring-primary/15"
          />
        </div>

        {message && (
          <p className="rounded-2xl border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm font-semibold text-destructive">
            {message}
          </p>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full rounded-full bg-primary py-3 font-bold text-primary-foreground transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Đang xử lý...' : isLogin ? 'Đăng nhập' : 'Đăng ký'}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        {isLogin ? 'Chưa có tài khoản?' : 'Đã có tài khoản?'}{' '}
        <Link href={isLogin ? '/register' : '/login'} className="font-bold text-primary hover:text-primary/80">
          {isLogin ? 'Đăng ký' : 'Đăng nhập'}
        </Link>
      </p>
    </div>
  );
}
