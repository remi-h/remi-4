"use client";

import { useRouter } from "next/navigation";

type BackButtonProps = {
  label?: string;
};

export const BackButton = ({ label = "back" }: BackButtonProps) => {
  const router = useRouter();

  return (
    <button
      className="font-bitcount text-md text-[#ffd073] hover:text-[#ce9eff]  hover:cursor-pointer"
      onClick={() => router.back()}
      type="button"
    >
      &lt; {label}
    </button>
  );
};
