import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const handler = NextAuth({
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text" },
      },
      async authorize(credentials) {
        // 🔹 Dummy check
        if (credentials?.email === "test@example.com") {
          return { id: "1", name: "Demo User", email: "test@example.com" };
        }
        // ❌ return null means login failed
        return null;
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/signin", // your custom sign-in page
  },
});

export { handler as GET, handler as POST };
