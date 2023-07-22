import type { NextAuthOptions } from "next-auth";

import { compare } from "bcrypt";
import prisma from "~/db/prisma.js";
import NextAuth from "next-auth/next";

import { default as GithubProvider } from "next-auth/providers/github";
import * as GoogleProvider from "next-auth/providers/google";
import RedditProvider from "next-auth/providers/reddit";
import DiscordProvider from "next-auth/providers/discord";
import CredentialsProvider from "next-auth/providers/credentials";

export const authOptions: NextAuthOptions = {
    providers: [
        GithubProvider.default({
            clientId: "",
            clientSecret: "",
        }),
        GoogleProvider({
            clientId: "",
            clientSecret: "",
        }),
        RedditProvider({
            clientId: "",
            clientSecret: "",
        }),
        DiscordProvider({
            clientId: "",
            clientSecret: "",
        }),
        CredentialsProvider({
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            async authorize(credentials) {
                const { email, password } = credentials ?? {};
                if (!email || !password) {
                    throw new Error("Missing username or password");
                }

                const user = await prisma.user.findUnique({ where: { email } });
                if (!user || !(await compare(password, user.password))) {
                    throw new Error("Invalid username or password");
                }

                return user;
            },
        }),
    ],
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
