"use client";

import { useEffect, useRef } from 'react';

export const Cursor = () => {
    const cursorRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const moveCursor = (e: MouseEvent) => {
            if (cursorRef.current) {
                cursorRef.current.style.left = `${e.clientX}px`;
                cursorRef.current.style.top = `${e.clientY}px`;
            }
        };

        document.addEventListener('mousemove', moveCursor);

        return () => document.removeEventListener('mousemove', moveCursor);
    }, []);

    return (
        <div
            ref={cursorRef}
            className="fixed pointer-events-none w-4 h-4 bg-white rounded-full z-50 border border-black/20"
            style={{ transform: 'translate(-50%, -50%)' }}
        />
    );
};