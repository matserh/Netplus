// Session type augmentation for our custom AuthContext
// (kept for type compatibility — no runtime import of next-auth)

declare module '@/contexts/AuthContext' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      image?: string | null;
    };
    expires: string;
  }
}