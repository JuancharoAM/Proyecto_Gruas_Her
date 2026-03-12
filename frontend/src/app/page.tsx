"use client";

/**
 * Página raíz — Redirección automática
 * Si el usuario tiene un token válido, redirige al dashboard.
 * Si no, redirige al login.
 */

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function HomePage() {
    const router = useRouter();

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (token) {
            router.replace("/dashboard");
        } else {
            router.replace("/login");
        }
    }, [router]);

    return null;
}
