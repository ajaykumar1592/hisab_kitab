import { ReactNode } from 'react';

export const revalidate = 0;

export default function LoginLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}