"use client";

import { FormEvent, useState } from 'react';

const NEWSLETTER_KEY = 'ticketbox-newsletter-emails';

function getStoredEmails() {
  const stored = window.localStorage.getItem(NEWSLETTER_KEY);
  if (!stored) {
    return [];
  }

  try {
    return JSON.parse(stored) as string[];
  } catch {
    return [];
  }
}

export function NewsletterSignup() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
      setMessage('Vui lòng nhập email hợp lệ.');
      return;
    }

    const emails = getStoredEmails();
    if (emails.includes(normalizedEmail)) {
      setMessage('Email này đã có trong danh sách nhận thông báo.');
      return;
    }

    window.localStorage.setItem(NEWSLETTER_KEY, JSON.stringify([...emails, normalizedEmail]));
    setEmail('');
    setMessage('Đã lưu email. TicketBox sẽ thông báo khi có show mới.');
  }

  return (
    <form onSubmit={handleSubmit} className="self-center">
      <div className="flex flex-col gap-3 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="email@example.com"
          aria-label="Email nhận thông báo"
          className="min-h-12 flex-1 rounded-full border border-white/15 bg-white/10 px-5 text-background placeholder:text-background/45 focus:outline-none focus:ring-4 focus:ring-primary/30"
        />
        <button
          type="submit"
          className="min-h-12 rounded-full bg-primary px-6 font-bold text-primary-foreground transition hover:bg-primary/90 active:translate-y-px"
        >
          Đăng ký
        </button>
      </div>
      {message && <p className="mt-3 text-sm font-semibold text-background/75">{message}</p>}
    </form>
  );
}
