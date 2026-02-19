import { ReactNode } from 'react';
import { Link } from 'react-router-dom';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <div className="app">
      <header className="header">
        <Link to="/" className="logo">Carbon</Link>
        <span className="tagline">Mock Service</span>
      </header>
      <main className="main">{children}</main>
    </div>
  );
}
