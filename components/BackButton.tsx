"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  label?: string;
};

export const BackButton = ({ label = "back" }: BackButtonProps) => {
  const router = useRouter();

  return (
    <button
      className="font-bitcount text-md text-vermilion-text hover:underline hover:cursor-pointer"
      onClick={() => router.back()}
      type="button"
    >
      &lt; {label}
    </button>
  );
};
