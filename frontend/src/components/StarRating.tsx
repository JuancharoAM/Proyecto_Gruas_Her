"use client";

import { useState } from "react";

interface StarRatingProps {
    value: number;
    onChange?: (value: number) => void;
    readonly?: boolean;
    size?: number;
}

export default function StarRating({ value, onChange, readonly = false, size = 24 }: StarRatingProps) {
    const [hoverValue, setHoverValue] = useState(0);

    const displayValue = hoverValue || value;

    return (
        <div
            style={{ display: "inline-flex", gap: "2px", cursor: readonly ? "default" : "pointer" }}
            onMouseLeave={() => !readonly && setHoverValue(0)}
        >
            {[1, 2, 3, 4, 5].map((star) => (
                <svg
                    key={star}
                    width={size}
                    height={size}
                    viewBox="0 0 24 24"
                    fill={star <= displayValue ? "#f5a623" : "var(--border-color, #ccc)"}
                    style={{ transition: "fill 0.15s ease" }}
                    onMouseEnter={() => !readonly && setHoverValue(star)}
                    onClick={() => !readonly && onChange?.(star)}
                >
                    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                </svg>
            ))}
        </div>
    );
}
